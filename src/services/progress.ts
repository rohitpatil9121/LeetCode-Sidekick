import type { HintLevel, ProblemSession, ProgressEntry, StreakState } from "@/types";
import { loadProgress, loadStreak, saveStreak, upsertProgress } from "@/utils/storage";
import { todayKey } from "@/utils/text";

/** Ladder hints only (levels 0-4) count toward hint dependency. */
function ladderHints(session: ProblemSession) {
  return session.hints.filter((h) => h.requestType === "next_hint");
}

export function sessionToProgress(session: ProblemSession): ProgressEntry {
  const ladder = ladderHints(session);
  const highest = ladder.reduce<HintLevel | -1>((m, h) => (h.hintLevel > m ? h.hintLevel : m), -1);
  return {
    problemId: session.problemId,
    problemTitle: session.problemTitle,
    difficulty: session.difficulty,
    language: session.language,
    timeSpent: Math.round(session.activeSeconds),
    hintsUsed: session.hints.length,
    highestHintLevel: highest,
    solved: session.solved,
    attempts: session.attemptCount,
    timestamp: session.solvedAt ?? session.lastActiveAt,
  };
}

export async function recordProgress(session: ProblemSession): Promise<void> {
  await upsertProgress(sessionToProgress(session));
  await touchStreak();
}

/** Streak counts days with at least one attempt. Missing a day resets it. */
export async function touchStreak(): Promise<StreakState> {
  const s = await loadStreak();
  const today = todayKey();
  if (s.lastActiveDay === today) return s;
  const yesterday = todayKey(new Date(Date.now() - 86_400_000));
  const current = s.lastActiveDay === yesterday ? s.current + 1 : 1;
  const next: StreakState = { current, best: Math.max(s.best, current), lastActiveDay: today };
  await saveStreak(next);
  return next;
}

export async function currentStreak(): Promise<number> {
  const s = await loadStreak();
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 86_400_000));
  if (s.lastActiveDay === today || s.lastActiveDay === yesterday) return s.current;
  return 0;
}

export interface Stats {
  solved: number;
  attempted: number;
  hintsUsed: number;
  avgSolveSeconds: number;
  independentRate: number; // 0..1 of solved problems with no ladder hint
  dependency: Record<"none" | "0" | "1" | "2" | "3" | "4", number>; // share of solved problems by highest level
  today: { attempted: number; solved: number; independent: number; seconds: number };
}

export async function computeStats(): Promise<Stats> {
  const all = await loadProgress();
  const solved = all.filter((p) => p.solved);
  const independent = solved.filter((p) => p.highestHintLevel < 0);
  const avg = solved.length ? solved.reduce((a, p) => a + p.timeSpent, 0) / solved.length : 0;

  const dependency: Stats["dependency"] = { none: 0, "0": 0, "1": 0, "2": 0, "3": 0, "4": 0 };
  for (const p of solved) {
    const k = p.highestHintLevel < 0 ? "none" : (String(Math.min(p.highestHintLevel, 4)) as keyof Stats["dependency"]);
    dependency[k] += 1;
  }
  if (solved.length) {
    for (const k of Object.keys(dependency) as (keyof Stats["dependency"])[]) {
      dependency[k] = dependency[k] / solved.length;
    }
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const todays = all.filter((p) => p.timestamp >= start.getTime());

  return {
    solved: solved.length,
    attempted: all.length,
    hintsUsed: all.reduce((a, p) => a + p.hintsUsed, 0),
    avgSolveSeconds: avg,
    independentRate: solved.length ? independent.length / solved.length : 0,
    dependency,
    today: {
      attempted: todays.length,
      solved: todays.filter((p) => p.solved).length,
      independent: todays.filter((p) => p.solved && p.highestHintLevel < 0).length,
      seconds: todays.reduce((a, p) => a + p.timeSpent, 0),
    },
  };
}
