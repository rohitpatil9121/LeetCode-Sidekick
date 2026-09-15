import "dotenv/config";
import express from "express";
import cors from "cors";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { buildSystemPrompt, buildUserMessage } from "./prompt.mjs";
import { checkSpoilers } from "./spoilerGuard.mjs";

/**
 * Senior's Hint backend.
 * Holds the Anthropic API key, shapes the prompt per hint level, validates
 * the model's output against the anti-spoiler rules, and retries once with
 * a corrective note if the model over-shares.
 */

const PORT = Number(process.env.PORT || 8787);
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5";
const EFFORT = process.env.ANTHROPIC_EFFORT || "medium";
const API_KEY = process.env.ANTHROPIC_API_KEY;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use(
  cors({
    origin(origin, cb) {
      // Extension requests come from chrome-extension://<id>. Allow those by
      // default; restrict with ALLOWED_ORIGINS if you host this publicly.
      if (!origin || origin.startsWith("chrome-extension://") || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Origin not allowed"));
    },
  }),
);

// ---- Simple per-IP rate limit (no dependency) ----------------------------
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = Number(process.env.RATE_LIMIT_PER_MIN || 30);
const buckets = new Map();
app.use((req, res, next) => {
  const key = req.ip;
  const now = Date.now();
  const b = buckets.get(key) ?? { start: now, n: 0 };
  if (now - b.start > WINDOW_MS) Object.assign(b, { start: now, n: 0 });
  b.n += 1;
  buckets.set(key, b);
  if (b.n > MAX_PER_WINDOW) return res.status(429).json({ error: "Slow down. Think for a minute, then try again." });
  next();
});

// ---- Schemas --------------------------------------------------------------

const HintLevel = z.number().int().min(0).max(5);

const RequestSchema = z.object({
  problem: z.object({
    title: z.string().min(1).max(200),
    difficulty: z.string().max(20),
    description: z.string().max(20_000),
    examples: z.array(z.string().max(4000)).max(10),
    constraints: z.array(z.string().max(500)).max(30),
  }),
  user: z.object({
    language: z.string().max(40),
    currentCode: z.string().max(40_000).optional(),
    hintLevel: HintLevel,
    attemptCount: z.number().int().min(0).max(1000),
    userNote: z.string().max(4000).optional(),
    userAnswer: z.string().max(4000).optional(),
  }),
  request: z.object({
    type: z.enum(["next_hint", "explain_problem", "debug_code", "complexity_check", "edge_case_check"]),
    targetLevel: HintLevel,
    previousHints: z.array(z.object({ level: HintLevel, message: z.string().max(4000) })).max(12),
    step: z.number().int().min(0).max(20).optional(),
  }),
  settings: z.object({
    personality: z.enum(["chill", "balanced", "strict"]),
    strictness: z.enum(["socratic", "balanced", "direct"]),
  }),
});

const ResponseSchema = z.object({
  hintLevel: z.number().int().min(0).max(5),
  title: z.string(),
  message: z.string(),
  spoilerRisk: z.enum(["low", "medium", "high"]),
  nextAction: z.string(),
  done: z.boolean().optional(),
  verdict: z.enum(["correct", "incorrect", "partial"]).optional(),
});

// ---- Routes ---------------------------------------------------------------

app.get("/health", (_req, res) => {
  res.json({ ok: true, model: MODEL, configured: Boolean(API_KEY) });
});

app.post("/api/hint", async (req, res) => {
  if (!API_KEY) {
    return res.status(503).json({ error: "ANTHROPIC_API_KEY is not set on the server." });
  }
  const parsed = RequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }
  const body = parsed.data;

  // Never accept code for anything but debugging, even if the client sends it.
  if (body.request.type !== "debug_code") delete body.user.currentCode;

  // The ladder tops out at 4. Coach/debug requests are pinned at 5.
  const targetLevel =
    body.request.type === "next_hint" ? Math.min(body.request.targetLevel, 4) : body.request.type === "explain_problem" ? 0 : 5;

  const client = new Anthropic({ apiKey: API_KEY });
  const system = buildSystemPrompt({
    targetLevel,
    personality: body.settings.personality,
    strictness: body.settings.strictness,
    type: body.request.type,
  });
  const userMessage = buildUserMessage({ ...body, request: { ...body.request, targetLevel } });

  try {
    let result = await generate(client, system, userMessage);
    let check = checkSpoilers(result.message, targetLevel, body.request.type);

    if (!check.ok) {
      // One corrective retry, then fail closed.
      const correction = `Your previous draft violated the level rules: ${check.reasons.join("; ")}. Rewrite it for LEVEL ${targetLevel} without those elements. Reveal strictly less.`;
      result = await generate(client, system, userMessage, [
        { role: "assistant", content: JSON.stringify(result) },
        { role: "user", content: correction },
      ]);
      check = checkSpoilers(result.message, targetLevel, body.request.type);
      if (!check.ok) {
        console.warn("[spoiler] failed closed:", check.reasons);
        return res.status(422).json({ error: "I drafted something that gives away too much. Ask again and I'll be more careful." });
      }
    }

    // Normalise the level so the client can't be pushed past what it asked for.
    result.hintLevel = body.request.type === "next_hint" ? targetLevel : result.hintLevel;
    return res.json(result);
  } catch (err) {
    return handleApiError(err, res);
  }
});

async function generate(client, system, userMessage, extraTurns = []) {
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: userMessage }, ...extraTurns],
    output_config: { effort: EFFORT, format: zodOutputFormat(ResponseSchema) },
  });
  if (response.stop_reason === "refusal") {
    throw Object.assign(new Error("The model declined this request."), { status: 422 });
  }
  if (!response.parsed_output) {
    throw Object.assign(new Error("Model returned an unparseable response."), { status: 502 });
  }
  return response.parsed_output;
}

function handleApiError(err, res) {
  if (err instanceof Anthropic.AuthenticationError) {
    return res.status(503).json({ error: "The server's API key was rejected." });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return res.status(429).json({ error: "Rate limited by the model provider. Try again shortly." });
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return res.status(502).json({ error: "Could not reach the model provider." });
  }
  if (err instanceof Anthropic.APIError) {
    console.error("[anthropic]", err.status, err.message);
    return res.status(502).json({ error: `Model provider error (${err.status}).` });
  }
  const status = err?.status && Number.isInteger(err.status) ? err.status : 500;
  console.error("[server]", err);
  return res.status(status).json({ error: err?.message || "Unexpected server error." });
}

app.listen(PORT, () => {
  console.log(`Senior's Hint backend listening on http://localhost:${PORT} (model: ${MODEL}, key: ${API_KEY ? "set" : "MISSING"})`);
});
