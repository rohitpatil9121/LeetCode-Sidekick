import { useCallback, useEffect, useRef, useState } from "react";
import type {
  HintLevel,
  HintRecord,
  HintRequest,
  HintResponse,
  ProblemInfo,
  ProblemSession,
  RequestType,
  Settings,
  StuckReason,
} from "@/types";
import { MAX_LADDER_LEVEL } from "@/types";
import { newSession, newTimer, timerElapsed, touchSession } from "@/services/session";
import { requestHint } from "@/services/hintApi";
import { readEditor } from "@/services/leetcode";
import { recordProgress, touchStreak } from "@/services/progress";
import { clearSession, loadSession, saveSession } from "@/utils/storage";
import { uid } from "@/utils/text";

export type AskState =
  | { status: "idle" }
  | { status: "loading"; type: RequestType }
  | { status: "error"; message: string; code?: string; retry: () => void };

const STUCK_TO_LEVEL: Record<StuckReason, HintLevel> = {
  understanding: 0,
  approach: 1,
  insight: 3,
  logic: 4,
  debugging: 5,
};

/**
 * Owns the per-problem session: hint ladder, timer, coach flows, persistence.
 * Every mutation goes through `commit` so storage stays in sync.
 */
export function useSession(problem: ProblemInfo | null, settings: Settings) {
  const [session, setSession] = useState<ProblemSession | null>(null);
  const [ask, setAsk] = useState<AskState>({ status: "idle" });
  const sessionRef = useRef<ProblemSession | null>(null);
  sessionRef.current = session;

  // Load or create when the problem changes.
  useEffect(() => {
    if (!problem) {
      setSession(null);
      return;
    }
    let alive = true;
    loadSession(problem.id).then((stored) => {
      if (!alive) return;
      const s = stored ?? newSession(problem, settings.defaultLanguage, settings.thinkMinutes);
      setSession(touchSession({ ...s, lastActiveAt: Date.now() }));
      touchStreak();
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.id]);

  const commit = useCallback((updater: (s: ProblemSession) => ProblemSession) => {
    setSession((prev) => {
      if (!prev) return prev;
      const next = updater(touchSession(prev));
      void saveSession(next);
      return next;
    });
  }, []);

  // Periodically flush active time so the dashboard stays honest.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") commit((s) => s);
    }, 60_000);
    return () => window.clearInterval(id);
  }, [commit]);

  // ---- Core ask ----------------------------------------------------------

  const send = useCallback(
    async (type: RequestType, targetLevel: HintLevel, extra: Partial<HintRequest["user"]> = {}, step?: number) => {
      const s = sessionRef.current;
      if (!problem || !s) return null;

      const needsCode = type === "debug_code";
      const editor = needsCode ? await readEditor() : null;
      if (needsCode && !editor?.code.trim()) {
        setAsk({
          status: "error",
          message: "Your editor looks empty. Write your attempt first, then I'll look at it.",
          code: "empty",
          retry: () => setAsk({ status: "idle" }),
        });
        return null;
      }

      const payload: HintRequest = {
        problem: {
          title: problem.title,
          difficulty: problem.difficulty,
          description: problem.description,
          examples: problem.examples,
          constraints: problem.constraints,
        },
        user: {
          language: editor?.language || s.language,
          currentCode: needsCode ? editor?.code : undefined,
          hintLevel: (s.hintLevel < 0 ? 0 : s.hintLevel) as HintLevel,
          attemptCount: s.attemptCount,
          ...extra,
        },
        request: {
          type,
          targetLevel,
          previousHints: s.hints
            .filter((h) => h.requestType === type || h.requestType === "next_hint")
            .slice(-6)
            .map((h) => ({ level: h.hintLevel, message: h.message })),
          step,
        },
        settings: { personality: settings.personality, strictness: settings.strictness },
      };

      setAsk({ status: "loading", type });
      const res = await requestHint(payload);
      if (!res.ok) {
        setAsk({
          status: "error",
          message: res.error,
          code: res.code,
          retry: () => void send(type, targetLevel, extra, step),
        });
        return null;
      }

      const record: HintRecord = { ...res.data, id: uid(), requestType: type, createdAt: Date.now() };
      commit((prev) => {
        const isLadder = type === "next_hint";
        const level = isLadder ? Math.max(prev.hintLevel, Math.min(res.data.hintLevel, MAX_LADDER_LEVEL)) : prev.hintLevel;
        return {
          ...prev,
          hasStarted: true,
          hints: [...prev.hints, record],
          hintLevel: level as HintLevel | -1,
          attemptCount: type === "debug_code" ? prev.attemptCount + 1 : prev.attemptCount,
          language: editor?.language || prev.language,
        };
      });
      setAsk({ status: "idle" });
      return res.data as HintResponse;
    },
    [problem, settings, commit],
  );

  // ---- Public actions ----------------------------------------------------

  /** "Need another nudge" — one rung up the ladder. */
  const nextHint = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    const target = Math.min(s.hintLevel + 1, MAX_LADDER_LEVEL) as HintLevel;
    void send("next_hint", target);
  }, [send]);

  /** "I'm stuck" with a reason — jump to the matching rung, never past it. */
  const stuck = useCallback(
    (reason: StuckReason, note?: string) => {
      const s = sessionRef.current;
      if (!s) return;
      commit((p) => ({ ...p, userUnderstanding: reason, hasStarted: true }));
      const target = STUCK_TO_LEVEL[reason];
      if (reason === "debugging") {
        void send("debug_code", 5, { userNote: note });
      } else if (reason === "understanding") {
        void send("explain_problem", 0, { userNote: note });
      } else {
        // Jump to the rung that matches where they're stuck. If they already
        // have that rung (or a stronger one), give exactly one more, never a leap.
        const level = (target > s.hintLevel ? target : Math.min(s.hintLevel + 1, MAX_LADDER_LEVEL)) as HintLevel;
        void send("next_hint", level, { userNote: note });
      }
    },
    [send, commit],
  );

  const debugCode = useCallback((note?: string) => void send("debug_code", 5, { userNote: note }), [send]);

  const complexityCheck = useCallback(
    (answer: string) => send("complexity_check", 5, { userAnswer: answer }),
    [send],
  );

  const edgeCaseStep = useCallback(
    (step: number, answer?: string) => send("edge_case_check", 5, { userAnswer: answer }, step),
    [send],
  );

  // ---- Timer ---------------------------------------------------------------

  const timer = {
    start: () =>
      commit((s) => ({
        ...s,
        hasStarted: true,
        timer: { ...s.timer, running: true, startedAt: Date.now(), finished: false },
      })),
    pause: () =>
      commit((s) => ({
        ...s,
        timer: { ...s.timer, running: false, accumulated: timerElapsed(s.timer), startedAt: null },
      })),
    reset: () => commit((s) => ({ ...s, timer: newTimer(settings.thinkMinutes * 60) })),
    finish: () =>
      commit((s) => ({
        ...s,
        timer: { ...s.timer, running: false, accumulated: timerElapsed(s.timer), startedAt: null, finished: true },
      })),
  };

  // ---- Lifecycle -----------------------------------------------------------

  const markSolved = useCallback(() => {
    commit((s) => {
      const next = { ...s, solved: true, solvedAt: s.solvedAt ?? Date.now(), hasStarted: true };
      void recordProgress(next);
      return next;
    });
  }, [commit]);

  const markComplexityDone = useCallback(() => commit((s) => ({ ...s, complexityDone: true })), [commit]);

  const setTakeaway = useCallback(
    (takeaway: string) =>
      commit((s) => {
        const next = { ...s, takeaway, complete: true };
        void recordProgress(next);
        return next;
      }),
    [commit],
  );

  const bumpAttempt = useCallback(() => commit((s) => ({ ...s, attemptCount: s.attemptCount + 1 })), [commit]);

  const reset = useCallback(async () => {
    if (!problem) return;
    await clearSession(problem.id);
    setSession(newSession(problem, settings.defaultLanguage, settings.thinkMinutes));
    setAsk({ status: "idle" });
  }, [problem, settings]);

  return {
    session,
    ask,
    nextHint,
    stuck,
    debugCode,
    complexityCheck,
    edgeCaseStep,
    timer,
    markSolved,
    markComplexityDone,
    setTakeaway,
    bumpAttempt,
    reset,
    dismissError: () => setAsk({ status: "idle" }),
  };
}
