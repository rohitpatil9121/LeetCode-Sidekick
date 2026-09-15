/** Server-side anti-spoiler validation. Mirrors src/utils/spoilerGuard.ts. */

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
const EXECUTABLE_RE =
  /(\bdef \w+\(|\bclass \w+[:{(]|public static|#include|\bfunction\s*\w*\s*\(|=>\s*\{|for\s*\(.*;.*;.*\)|std::|System\.out|console\.log|\bfn main|\bimport \w+|\breturn\s+[^;\n]+;)/;

export function checkSpoilers(message, level, type) {
  const reasons = [];
  const lower = message.toLowerCase();
  const techniquesAllowed = level >= 2 || type === "complexity_check" || type === "debug_code";
  const complexityAllowed = level >= 3 || type === "complexity_check" || type === "debug_code";

  if (!techniquesAllowed) {
    const leaked = TECHNIQUE_TERMS.filter((t) => lower.includes(t));
    if (leaked.length) reasons.push(`names a technique too early (${leaked.slice(0, 3).join(", ")})`);
  }
  if (!complexityAllowed && COMPLEXITY_RE.test(message)) reasons.push("uses big-O notation too early");

  const fences = message.match(CODE_FENCE_RE) ?? [];
  if (fences.some((f) => EXECUTABLE_RE.test(f))) reasons.push("contains executable-looking code");
  if (level < 4 && type !== "debug_code" && fences.length) reasons.push("contains a code block before level 4");
  if (type === "debug_code" && fences.some((f) => f.split("\n").length > 4)) reasons.push("quotes more than a few lines of code while debugging");

  return { ok: reasons.length === 0, reasons };
}
