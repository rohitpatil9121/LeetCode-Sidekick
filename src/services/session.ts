import type { ProblemInfo, ProblemSession, TimerState } from "@/types";

export function newTimer(targetSeconds: number): TimerState {
  return { running: false, startedAt: null, accumulated: 0, target: targetSeconds, finished: false };
}

export function timerElapsed(t: TimerState, now = Date.now()): number {
  return t.accumulated + (t.running && t.startedAt ? (now - t.startedAt) / 1000 : 0);
}

export function newSession(problem: ProblemInfo, language: string, thinkMinutes: number): ProblemSession {
  const now = Date.now();
  return {
    problemId: problem.id,
    problemTitle: problem.title,
    difficulty: problem.difficulty,
    language,
    hintLevel: -1,
    hasStarted: false,
    hints: [],
    attemptCount: 0,
    userUnderstanding: null,
    timer: newTimer(thinkMinutes * 60),
    solved: false,
    complexityDone: false,
    complete: false,
    startedAt: now,
    lastActiveAt: now,
    activeSeconds: 0,
  };
}

/** Adds wall time since last activity, capped so idle tabs don't inflate stats. */
export function touchSession(s: ProblemSession, now = Date.now()): ProblemSession {
  const delta = Math.min((now - s.lastActiveAt) / 1000, 120);
  return { ...s, lastActiveAt: now, activeSeconds: s.activeSeconds + Math.max(0, delta) };
}
