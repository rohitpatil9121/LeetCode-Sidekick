/** Convert LeetCode's HTML problem content into readable plain text. */
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("sup").forEach((s) => (s.textContent = `^${s.textContent}`));
  doc.querySelectorAll("br").forEach((b) => b.replaceWith("\n"));
  doc.querySelectorAll("p, pre, li, div, h1, h2, h3").forEach((el) => {
    el.append("\n");
  });
  const text = doc.body.textContent ?? "";
  return text
    .replace(/ /g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export interface ParsedProblemText {
  description: string;
  examples: string[];
  constraints: string[];
}

/** Split problem text into description / examples / constraints. */
export function parseProblemText(text: string): ParsedProblemText {
  const lines = text.split("\n");
  const description: string[] = [];
  const examples: string[] = [];
  const constraints: string[] = [];
  let mode: "desc" | "example" | "constraints" | "followup" = "desc";
  let current: string[] = [];

  const flushExample = () => {
    if (current.length) examples.push(current.join("\n").trim());
    current = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^Example\s*\d*\s*:/.test(line)) {
      flushExample();
      mode = "example";
      current.push(line);
      continue;
    }
    if (/^Constraints\s*:/.test(line)) {
      flushExample();
      mode = "constraints";
      continue;
    }
    if (/^Follow[- ]up/i.test(line)) {
      flushExample();
      mode = "followup";
      description.push("", line);
      continue;
    }
    if (mode === "desc" || mode === "followup") description.push(line);
    else if (mode === "example") current.push(line);
    else if (mode === "constraints" && line.trim()) constraints.push(line.trim());
  }
  flushExample();

  return {
    description: description.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    examples,
    constraints,
  };
}

export function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
