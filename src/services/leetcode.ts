import type { Difficulty, EditorSnapshot, ProblemInfo } from "@/types";
import { htmlToText, parseProblemText } from "@/utils/text";
import { cacheProblem, loadCachedProblem } from "@/utils/storage";

/**
 * LeetCode adapter.
 * Problem content comes from LeetCode's own GraphQL endpoint (same-origin,
 * so no extra permissions) with a DOM fallback. Editor code is read via the
 * MAIN-world bridge in content/editorBridge.ts.
 */

export function getProblemSlug(url = location.href): string | null {
  const m = url.match(/\/problems\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : null;
}

function normalizeDifficulty(d: string | undefined): Difficulty {
  if (!d) return "Unknown";
  const s = d.toLowerCase();
  if (s.startsWith("easy")) return "Easy";
  if (s.startsWith("med")) return "Medium";
  if (s.startsWith("hard")) return "Hard";
  return "Unknown";
}

async function fetchViaGraphQL(slug: string): Promise<ProblemInfo | null> {
  const query = `
    query questionData($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionFrontendId
        title
        difficulty
        content
      }
    }`;
  const res = await fetch(`${location.origin}/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { titleSlug: slug } }),
    credentials: "same-origin",
  });
  if (!res.ok) return null;
  const json = await res.json();
  const q = json?.data?.question;
  if (!q?.title || !q?.content) return null;
  const parsed = parseProblemText(htmlToText(q.content));
  return {
    id: slug,
    numericId: q.questionFrontendId,
    title: q.title,
    difficulty: normalizeDifficulty(q.difficulty),
    ...parsed,
    url: `${location.origin}/problems/${slug}/`,
    extractedAt: Date.now(),
  };
}

function extractViaDOM(slug: string): ProblemInfo | null {
  const titleEl =
    document.querySelector<HTMLElement>('[data-cy="question-title"]') ??
    document.querySelector<HTMLElement>(".text-title-large") ??
    document.querySelector<HTMLElement>('a[href*="/problems/' + slug + '/"]');
  const contentEl =
    document.querySelector<HTMLElement>('[data-track-load="description_content"]') ??
    document.querySelector<HTMLElement>(".question-content") ??
    document.querySelector<HTMLElement>('[class*="content__"]');
  if (!titleEl || !contentEl) return null;
  const rawTitle = titleEl.textContent?.trim() ?? "";
  const title = rawTitle.replace(/^\d+\.\s*/, "");
  const diffEl = document.querySelector<HTMLElement>('[class*="text-difficulty-"], [diff]');
  const parsed = parseProblemText(htmlToText(contentEl.innerHTML));
  return {
    id: slug,
    numericId: rawTitle.match(/^(\d+)\./)?.[1],
    title,
    difficulty: normalizeDifficulty(diffEl?.textContent ?? undefined),
    ...parsed,
    url: `${location.origin}/problems/${slug}/`,
    extractedAt: Date.now(),
  };
}

export async function detectProblem(): Promise<ProblemInfo | null> {
  const slug = getProblemSlug();
  if (!slug) return null;

  const cached = await loadCachedProblem<ProblemInfo>(slug);
  if (cached && Date.now() - cached.extractedAt < 7 * 24 * 3600 * 1000) return cached;

  let info: ProblemInfo | null = null;
  try {
    info = await fetchViaGraphQL(slug);
  } catch {
    info = null;
  }
  if (!info) info = extractViaDOM(slug);
  if (info) await cacheProblem(slug, info);
  return info;
}

// ---- Editor bridge --------------------------------------------------------

const BRIDGE_REQ = "SH_EDITOR_REQUEST";
const BRIDGE_RES = "SH_EDITOR_RESPONSE";

export function readEditor(timeoutMs = 1200): Promise<EditorSnapshot | null> {
  return new Promise((resolve) => {
    const nonce = Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(readEditorFromDOM());
    }, timeoutMs);

    function onMessage(ev: MessageEvent) {
      if (ev.source !== window || ev.data?.type !== BRIDGE_RES || ev.data?.nonce !== nonce) return;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      const { code, language } = ev.data;
      if (typeof code === "string" && code.trim()) {
        resolve({ code, language: language || readLanguageFromDOM() });
      } else {
        resolve(readEditorFromDOM());
      }
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ type: BRIDGE_REQ, nonce }, "*");
  });
}

function readLanguageFromDOM(): string {
  // The language picker is a button whose text is the language name.
  const candidates = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const known = ["python3", "python", "c++", "java", "javascript", "typescript", "go", "rust", "c#", "kotlin", "swift", "ruby", "c", "scala", "php", "dart", "elixir", "erlang", "racket"];
  for (const b of candidates) {
    const t = b.textContent?.trim().toLowerCase() ?? "";
    if (t.length <= 12 && known.includes(t)) return t;
  }
  return "unknown";
}

function readEditorFromDOM(): EditorSnapshot | null {
  // Monaco's .view-lines is virtualised; this is a best-effort fallback only.
  const lines = document.querySelectorAll<HTMLElement>(".monaco-editor .view-line");
  if (!lines.length) return null;
  const code = Array.from(lines)
    .map((l) => l.textContent?.replace(/ /g, " ") ?? "")
    .join("\n");
  return code.trim() ? { code, language: readLanguageFromDOM() } : null;
}

/** Fires once when LeetCode reports an accepted submission. Lightweight: only listens after a Submit click. */
export function watchForAccepted(onAccepted: () => void): () => void {
  let polling: number | null = null;

  const stopPolling = () => {
    if (polling !== null) {
      clearInterval(polling);
      polling = null;
    }
  };

  const onClick = (ev: MouseEvent) => {
    const target = ev.target as HTMLElement | null;
    const btn = target?.closest("button");
    if (!btn) return;
    const label = btn.textContent?.trim().toLowerCase();
    if (label !== "submit" && btn.getAttribute("data-e2e-locator") !== "console-submit-button") return;
    stopPolling();
    const started = Date.now();
    polling = window.setInterval(() => {
      const result = document.querySelector<HTMLElement>('[data-e2e-locator="submission-result"]');
      const text = result?.textContent?.trim().toLowerCase() ?? "";
      if (text.startsWith("accepted")) {
        stopPolling();
        onAccepted();
      } else if (Date.now() - started > 45_000) {
        stopPolling();
      }
    }, 1000);
  };

  document.addEventListener("click", onClick, true);
  return () => {
    document.removeEventListener("click", onClick, true);
    stopPolling();
  };
}
