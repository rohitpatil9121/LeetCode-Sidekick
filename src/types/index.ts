/** Hint ladder. Level 5 is the debugging mode, reachable directly. */
export type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const HINT_LEVEL_NAMES: Record<HintLevel, string> = {
  0: "Think",
  1: "Nudge",
  2: "Approach",
  3: "Key insight",
  4: "Pseudocode",
  5: "Debug",
};

export const MAX_LADDER_LEVEL: HintLevel = 4;

export type Difficulty = "Easy" | "Medium" | "Hard" | "Unknown";

export interface ProblemInfo {
  id: string; // slug, e.g. "two-sum"
  numericId?: string;
  title: string;
  difficulty: Difficulty;
  description: string;
  examples: string[];
  constraints: string[];
  url: string;
  extractedAt: number;
}

export interface EditorSnapshot {
  code: string;
  language: string;
}

export type RequestType =
  | "next_hint"
  | "explain_problem"
  | "debug_code"
  | "complexity_check"
  | "edge_case_check";

export type StuckReason =
  | "understanding"
  | "approach"
  | "insight"
  | "logic"
  | "debugging";

export interface HintRequest {
  problem: {
    title: string;
    difficulty: Difficulty;
    description: string;
    examples: string[];
    constraints: string[];
  };
  user: {
    language: string;
    currentCode?: string;
    hintLevel: HintLevel;
    attemptCount: number;
    userNote?: string;
    userAnswer?: string;
  };
  request: {
    type: RequestType;
    /** Level the caller wants the response pitched at. */
    targetLevel: HintLevel;
    /** Hints already shown, so the model can avoid repeating itself. */
    previousHints: { level: HintLevel; message: string }[];
    /** Follow-up step within a coach flow (edge cases / complexity). */
    step?: number;
  };
  settings: {
    personality: Personality;
    strictness: Strictness;
  };
}

export type SpoilerRisk = "low" | "medium" | "high";

export interface HintResponse {
  hintLevel: HintLevel;
  title: string;
  message: string;
  spoilerRisk: SpoilerRisk;
  nextAction: string;
  /** Coach flows: whether the coach has more questions. */
  done?: boolean;
  /** Complexity coach verdict when the user answered. */
  verdict?: "correct" | "incorrect" | "partial";
}

export interface HintRecord extends HintResponse {
  id: string;
  requestType: RequestType;
  createdAt: number;
}

export interface ProblemSession {
  problemId: string;
  problemTitle: string;
  difficulty: Difficulty;
  language: string;
  /** Highest ladder level reached; -1 when no ladder hint has been shown. */
  hintLevel: HintLevel | -1;
  hasStarted: boolean;
  hints: HintRecord[];
  attemptCount: number;
  userUnderstanding: StuckReason | null;
  timer: TimerState;
  solved: boolean;
  solvedAt?: number;
  complexityDone: boolean;
  takeaway?: string;
  complete: boolean;
  startedAt: number;
  lastActiveAt: number;
  activeSeconds: number;
}

export interface TimerState {
  running: boolean;
  /** Epoch ms when the running segment started. */
  startedAt: number | null;
  /** Seconds accumulated before startedAt. */
  accumulated: number;
  /** Target in seconds. */
  target: number;
  finished: boolean;
}

export interface ProgressEntry {
  problemId: string;
  problemTitle: string;
  difficulty: Difficulty;
  language: string;
  timeSpent: number; // seconds
  hintsUsed: number;
  highestHintLevel: HintLevel | -1;
  solved: boolean;
  attempts: number;
  timestamp: number;
}

export interface PanelLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  open: boolean;
}

export type Personality = "chill" | "balanced" | "strict";
export type Strictness = "socratic" | "balanced" | "direct";
export type Appearance = "dark" | "light" | "system";
export type DefaultLanguage = "python" | "cpp" | "java" | "javascript" | "go" | "rust";

export interface Settings {
  personality: Personality;
  strictness: Strictness;
  defaultLanguage: DefaultLanguage;
  appearance: Appearance;
  backendUrl: string;
  thinkMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = {
  personality: "balanced",
  strictness: "balanced",
  defaultLanguage: "python",
  appearance: "dark",
  backendUrl: import.meta.env?.VITE_BACKEND_URL || "http://localhost:8787",
  thinkMinutes: 5,
};

export interface StreakState {
  current: number;
  best: number;
  lastActiveDay: string | null; // YYYY-MM-DD
}

/** Messages between content script, background, and popup. */
export type Message =
  | { type: "HINT_REQUEST"; payload: HintRequest }
  | { type: "OPEN_OPTIONS" }
  | { type: "GET_ACTIVE_PROBLEM" }
  | { type: "COMMAND"; command: "open-panel" | "next-hint" }
  | { type: "OPEN_PANEL" };

export type HintApiResult =
  | { ok: true; data: HintResponse }
  | { ok: false; error: string; code?: "network" | "server" | "config" | "spoiler" };
