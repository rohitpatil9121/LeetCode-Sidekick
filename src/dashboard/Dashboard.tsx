import { useEffect, useState } from "react";
import type { ProgressEntry } from "@/types";
import { HINT_LEVEL_NAMES } from "@/types";
import { useResolvedTheme, useSettings } from "@/hooks/useSettings";
import { computeStats, currentStreak, type Stats } from "@/services/progress";
import { clearAllLocalData, loadProgress, onLocalChange } from "@/utils/storage";
import { formatDuration } from "@/utils/text";
import { SettingsForm } from "@/components/SettingsView";
import { cx } from "@/components/ui";

export function Dashboard() {
  const { settings, update } = useSettings();
  const theme = useResolvedTheme(settings.appearance);
  const [stats, setStats] = useState<Stats | null>(null);
  const [streak, setStreak] = useState(0);
  const [recent, setRecent] = useState<ProgressEntry[]>([]);

  const refresh = () => {
    computeStats().then(setStats);
    currentStreak().then(setStreak);
    loadProgress().then((p) => setRecent([...p].sort((a, b) => b.timestamp - a.timestamp).slice(0, 12)));
  };

  useEffect(() => {
    refresh();
    return onLocalChange(refresh);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.body.style.background = `rgb(var(--sh-bg))`;
  }, [theme]);

  const dep = stats?.dependency;
  const rows: { label: string; value: number }[] = dep
    ? [
        { label: "No hint", value: dep.none },
        { label: HINT_LEVEL_NAMES[0], value: dep["0"] },
        { label: HINT_LEVEL_NAMES[1], value: dep["1"] },
        { label: HINT_LEVEL_NAMES[2], value: dep["2"] },
        { label: HINT_LEVEL_NAMES[3], value: dep["3"] },
        { label: HINT_LEVEL_NAMES[4], value: dep["4"] },
      ]
    : [];

  return (
    <div data-theme={theme} className="sh-root min-h-screen bg-bg text-fg">
      <div className="mx-auto max-w-[880px] px-6 py-10">
        <header className="mb-8 flex items-end justify-between">
          <div>
            <div className="text-[12px] text-muted">Senior's Hint</div>
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Your DSA Progress</h1>
          </div>
          <div className="text-[13px] text-muted">{streak > 0 ? `🔥 ${streak} day streak` : "No streak yet. Start one today."}</div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Problems solved" value={String(stats?.solved ?? 0)} />
          <Stat label="Hints used" value={String(stats?.hintsUsed ?? 0)} />
          <Stat label="Average solve time" value={stats ? formatDuration(stats.avgSolveSeconds) : "—"} />
          <Stat label="Independent solves" value={stats ? `${Math.round(stats.independentRate * 100)}%` : "—"} accent />
        </section>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-[13px] font-semibold">Hint dependency</h2>
            <p className="mt-0.5 text-[12px] text-muted">Share of solved problems by the strongest hint you needed. Aim to push mass toward the top.</p>
            <div className="mt-4 space-y-2">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-24 text-muted">{r.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-raised">
                    <div className={cx("h-full rounded-full", r.label === "No hint" ? "bg-ok" : "bg-accent")} style={{ width: `${r.value * 100}%` }} />
                  </div>
                  <span className="w-10 text-right font-mono tabular-nums text-fg">{Math.round(r.value * 100)}%</span>
                </div>
              ))}
              {!stats?.solved && <div className="text-[12px] text-faint">Solve a problem to see the breakdown.</div>}
            </div>
            <p className="mt-5 border-t border-line pt-3 text-[11.5px] leading-relaxed text-faint">
              Learning &gt; speed. Understanding &gt; answers. Independence &gt; AI dependency.
            </p>
          </section>

          <section className="rounded-lg border border-line bg-surface p-5">
            <h2 className="text-[13px] font-semibold">Recent problems</h2>
            <div className="mt-3 divide-y divide-line">
              {recent.map((p) => (
                <div key={p.problemId} className="flex items-center gap-3 py-2 text-[12.5px]">
                  <span className={cx("inline-block h-1.5 w-1.5 shrink-0 rounded-full", p.solved ? "bg-ok" : "bg-faint")} />
                  <a href={`https://leetcode.com/problems/${p.problemId}/`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">
                    {p.problemTitle}
                  </a>
                  <span className="text-[11px] text-faint">{p.difficulty}</span>
                  <span className="w-20 text-right font-mono text-[11px] text-muted">
                    {p.highestHintLevel < 0 ? "no hint" : `L${p.highestHintLevel}`}
                  </span>
                  <span className="w-12 text-right font-mono text-[11px] text-muted">{formatDuration(p.timeSpent)}</span>
                </div>
              ))}
              {recent.length === 0 && <div className="py-2 text-[12px] text-faint">Nothing yet. Open a LeetCode problem to begin.</div>}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-lg border border-line bg-surface p-5">
          <h2 className="mb-4 text-[13px] font-semibold">Settings</h2>
          <SettingsForm
            settings={settings}
            onChange={update}
            onClearAll={async () => {
              await clearAllLocalData();
              refresh();
            }}
          />
          <div className="mt-5 border-t border-line pt-3 text-[11.5px] text-faint">
            Shortcuts: Alt+H opens the panel, Alt+N asks for the next hint, Esc minimizes. Change them at chrome://extensions/shortcuts.
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3.5">
      <div className="text-[11px] uppercase tracking-[0.06em] text-faint">{label}</div>
      <div className={cx("mt-1 font-mono text-[22px] tabular-nums leading-none", accent ? "text-ok" : "text-fg")}>{value}</div>
    </div>
  );
}
