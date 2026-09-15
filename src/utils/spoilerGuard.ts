import type { HintLevel, RequestType } from "@/types";

/**
 * Client-side anti-spoiler guard.
 * The backend enforces the same rules, but a second gate here means a leaky
 * response never reaches the screen even if the backend is misconfigured.
 */

const TECHNIQUE_TERMS = [
  "hash map", "hashmap", "hash table", "hashtable", "hash set", "hashset",
  "dictionary", "unordered_map", "two pointer", "two-pointer",
  "sliding window", "binary search", "dynamic programming", "memoiz",
  "dp table", "dp[", "prefix sum", "monotonic stack", "monotonic queue",
  "union find", "union-find", "disjoint set", "topological", "dijkstra",
  "bfs", "dfs", "breadth-first", "depth-first", "backtrack", "trie",
  "heap", "priority queue", "kadane", "bit manipulation", "bitmask",
  "segment tree", "fenwick", "binary indexed tree", "greedy",
  "floyd", "kmp", "rabin-karp", "z-algorithm",
];

const COMPLEXITY_RE = /\bO\s*\(\s*[^)]{1,20}\)/i;
const CODE_FENCE_RE = /```[\s\S]*?```/g;
const EXECUTABLE_HINTS_RE =
  /(\bdef \w+\(|\bclass \w+[:{(]|public static|#include|\bfunction\s*\w*\s*\(|=>\s*\{|for\s*\(.*;.*;.*\)|std::|System\.out|console\.log|\bfn main|\bimport \w+|\breturn\s+[^;\n]+;)/;

export interface SpoilerCheck {
  ok: boolean;
  reasons: string[];
}

function allowsTechniqueNames(level: HintLevel, type: RequestType): boolean {
  return level >= 2 || type === "complexity_check" || type === "debug_code";
}
function allowsComplexity(level: HintLevel, type: RequestType): boolean {
  return type === "complexity_check" || type === "debug_code" || level >= 3;
}

export function checkSpoilers(
  message: string,
  level: HintLevel,
  type: RequestType,
): SpoilerCheck {
  const reasons: string[] = [];
  const lower = message.toLowerCase();

  if (!allowsTechniqueNames(level, type)) {
    const leaked = TECHNIQUE_TERMS.filter((t) => lower.includes(t));
    if (leaked.length) reasons.push(`names a technique too early: ${leaked.slice(0, 3).join(", ")}`);
  }

  if (!allowsComplexity(level, type) && COMPLEXITY_RE.test(message)) {
    reasons.push("mentions big-O before the insight stage");
  }

  // Executable code is never allowed. Pseudocode fences at level 4 are fine
  // as long as they don't look like a real language.
  const fences = message.match(CODE_FENCE_RE) ?? [];
  for (const fence of fences) {
    if (EXECUTABLE_HINTS_RE.test(fence)) {
      reasons.push("contains executable-looking code");
      break;
    }
  }
  if (level < 4 && type !== "debug_code" && fences.length > 0) {
    reasons.push("contains a code block before the pseudocode stage");
  }

  return { ok: reasons.length === 0, reasons };
}

/** Last-resort redaction if the backend and its retry both leak. */
export function redactSpoilers(message: string, level: HintLevel, type: RequestType): string {
  let out = message;
  if (level < 4 && type !== "debug_code") {
    out = out.replace(CODE_FENCE_RE, "[snipped — too much, too soon]");
  }
  if (!allowsTechniqueNames(level, type)) {
    for (const t of TECHNIQUE_TERMS) {
      const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      out = out.replace(re, "[a technique you'll find]");
    }
  }
  if (!allowsComplexity(level, type)) out = out.replace(COMPLEXITY_RE, "[complexity]");
  return out;
}
