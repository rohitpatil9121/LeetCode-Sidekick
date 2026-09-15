import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

/**
 * LLM providers. Each `generate` takes (system, messages, schema) and returns
 * a plain object that the caller validates against the response schema.
 *
 *   LLM_PROVIDER=anthropic  (default)  ANTHROPIC_API_KEY, ANTHROPIC_MODEL, ANTHROPIC_EFFORT
 *   LLM_PROVIDER=groq                  GROQ_API_KEY, GROQ_MODEL
 */

export function createProvider(env) {
  const name = (env.LLM_PROVIDER || (env.GROQ_API_KEY && !env.ANTHROPIC_API_KEY ? "groq" : "anthropic")).toLowerCase();
  if (name === "groq") return groqProvider(env);
  return anthropicProvider(env);
}

// ---- Anthropic ---------------------------------------------------------------

function anthropicProvider(env) {
  const apiKey = env.ANTHROPIC_API_KEY;
  const model = env.ANTHROPIC_MODEL || "claude-opus-5";
  const effort = env.ANTHROPIC_EFFORT || "medium";
  const client = apiKey ? new Anthropic({ apiKey }) : null;

  return {
    name: "anthropic",
    model,
    configured: Boolean(apiKey),
    async generate(system, messages, schema) {
      const response = await client.messages.parse({
        model,
        max_tokens: 2048,
        system,
        messages,
        output_config: { effort, format: zodOutputFormat(schema) },
      });
      if (response.stop_reason === "refusal") throw status(422, "The model declined this request.");
      if (!response.parsed_output) throw status(502, "Model returned an unparseable response.");
      return response.parsed_output;
    },
    classifyError(err) {
      if (err instanceof Anthropic.AuthenticationError) return [503, "The server's API key was rejected."];
      if (err instanceof Anthropic.RateLimitError) return [429, "Rate limited by the model provider. Try again shortly."];
      if (err instanceof Anthropic.APIConnectionError) return [502, "Could not reach the model provider."];
      if (err instanceof Anthropic.APIError) return [502, `Model provider error (${err.status}).`];
      return null;
    },
  };
}

// ---- Groq (OpenAI-compatible chat completions, JSON mode) ----------------------

const JSON_INSTRUCTION = `
Respond with a single JSON object and nothing else. Keys:
  "hintLevel"   integer 0-5
  "title"       string, 2-5 words
  "message"     string, the hint body
  "spoilerRisk" "low" | "medium" | "high"
  "nextAction"  string, one sentence
  "done"        boolean (edge_case_check only, omit otherwise)
  "verdict"     "correct" | "incorrect" | "partial" (complexity_check only, omit otherwise)`;

function groqProvider(env) {
  const apiKey = env.GROQ_API_KEY;
  const model = env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const base = (env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, "");

  return {
    name: "groq",
    model,
    configured: Boolean(apiKey),
    async generate(system, messages, schema) {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          max_tokens: 1500,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: system + "\n" + JSON_INSTRUCTION }, ...messages],
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw Object.assign(new Error(`Groq ${res.status}: ${text.slice(0, 300)}`), { httpStatus: res.status });
      }
      const json = await res.json();
      const content = json?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw status(502, "Model returned no content.");
      let obj;
      try {
        obj = JSON.parse(content);
      } catch {
        throw status(502, "Model returned invalid JSON.");
      }
      // Drop nulls so optional fields validate.
      for (const k of Object.keys(obj)) if (obj[k] === null) delete obj[k];
      const parsed = schema.safeParse(obj);
      if (!parsed.success) throw status(502, "Model response did not match the expected shape.");
      return parsed.data;
    },
    classifyError(err) {
      if (err?.httpStatus === 401 || err?.httpStatus === 403) return [503, "The server's Groq API key was rejected."];
      if (err?.httpStatus === 429) return [429, "Rate limited by Groq. Try again shortly."];
      if (err?.httpStatus) return [502, `Groq error (${err.httpStatus}).`];
      if (err?.cause?.code || err?.name === "TypeError") return [502, "Could not reach Groq."];
      return null;
    },
  };
}

function status(code, message) {
  return Object.assign(new Error(message), { status: code });
}
