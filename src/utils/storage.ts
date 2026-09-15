import {
  DEFAULT_SETTINGS,
  type PanelLayout,
  type ProblemSession,
  type ProgressEntry,
  type Settings,
  type StreakState,
} from "@/types";

/**
 * Typed wrapper over chrome.storage.
 *  - sync:  settings (small, follows the user across devices)
 *  - local: sessions, progress, layout, streak (device-local)
 */

const KEYS = {
  settings: "sh:settings",
  layout: "sh:layout",
  progress: "sh:progress",
  streak: "sh:streak",
  session: (id: string) => `sh:session:${id}`,
  problemCache: (id: string) => `sh:problem:${id}`,
} as const;

async function get<T>(kind: "sync" | "local", key: string): Promise<T | undefined> {
  try {
    const res = await chrome.storage[kind].get(key);
    return res[key] as T | undefined;
  } catch {
    return undefined;
  }
}

async function set(kind: "sync" | "local", key: string, value: unknown): Promise<void> {
  try {
    await chrome.storage[kind].set({ [key]: value });
  } catch (e) {
    console.warn("[Senior's Hint] storage write failed", e);
  }
}

// ---- Settings -------------------------------------------------------------

export async function loadSettings(): Promise<Settings> {
  const stored = await get<Partial<Settings>>("sync", KEYS.settings);
  return { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await loadSettings()), ...patch };
  await set("sync", KEYS.settings, next);
  return next;
}

export function onSettingsChange(cb: (s: Settings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, ns: string) => {
    if (ns === "sync" && changes[KEYS.settings]) {
      cb({ ...DEFAULT_SETTINGS, ...(changes[KEYS.settings].newValue ?? {}) });
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

// ---- Panel layout ---------------------------------------------------------

export const DEFAULT_LAYOUT: PanelLayout = {
  x: -1, // -1 = compute from viewport on first mount
  y: 88,
  width: 380,
  height: 580,
  minimized: false,
  open: true,
};

export async function loadLayout(): Promise<PanelLayout> {
  const stored = await get<Partial<PanelLayout>>("local", KEYS.layout);
  return { ...DEFAULT_LAYOUT, ...(stored ?? {}) };
}

export async function saveLayout(layout: PanelLayout): Promise<void> {
  await set("local", KEYS.layout, layout);
}

// ---- Sessions -------------------------------------------------------------

export async function loadSession(problemId: string): Promise<ProblemSession | undefined> {
  return get<ProblemSession>("local", KEYS.session(problemId));
}

export async function saveSession(session: ProblemSession): Promise<void> {
  await set("local", KEYS.session(session.problemId), session);
}

export async function clearSession(problemId: string): Promise<void> {
  try {
    await chrome.storage.local.remove([KEYS.session(problemId), KEYS.problemCache(problemId)]);
  } catch {
    /* ignore */
  }
}

export async function cacheProblem<T>(problemId: string, problem: T): Promise<void> {
  await set("local", KEYS.problemCache(problemId), problem);
}

export async function loadCachedProblem<T>(problemId: string): Promise<T | undefined> {
  return get<T>("local", KEYS.problemCache(problemId));
}

// ---- Progress -------------------------------------------------------------

export async function loadProgress(): Promise<ProgressEntry[]> {
  return (await get<ProgressEntry[]>("local", KEYS.progress)) ?? [];
}

export async function upsertProgress(entry: ProgressEntry): Promise<void> {
  const all = await loadProgress();
  const idx = all.findIndex((p) => p.problemId === entry.problemId);
  if (idx >= 0) all[idx] = entry;
  else all.push(entry);
  await set("local", KEYS.progress, all);
}

export async function clearAllLocalData(): Promise<void> {
  try {
    await chrome.storage.local.clear();
  } catch {
    /* ignore */
  }
}

// ---- Streak ---------------------------------------------------------------

export async function loadStreak(): Promise<StreakState> {
  return (await get<StreakState>("local", KEYS.streak)) ?? { current: 0, best: 0, lastActiveDay: null };
}

export async function saveStreak(s: StreakState): Promise<void> {
  await set("local", KEYS.streak, s);
}

export function onLocalChange(cb: () => void): () => void {
  const listener = (_c: unknown, ns: string) => {
    if (ns === "local") cb();
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
