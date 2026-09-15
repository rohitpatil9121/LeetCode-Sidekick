import { useEffect, useState } from "react";
import { useResolvedTheme, useSettings } from "@/hooks/useSettings";
import { computeStats, currentStreak, type Stats } from "@/services/progress";
import { formatDuration } from "@/utils/text";
import { Button } from "@/components/ui";

export function Popup() {
  const { settings } = useSettings();
  const theme = useResolvedTheme(settings.appearance);
  const [stats, setStats] = useState<Stats | null>(null);
  const [streak, setStreak] = useState(0);
  const [active, setActive] = useState<{ id: string; title: string } | null | undefined>(undefined);

  useEffect(() => {
    computeStats().then(setStats);
    currentStreak().then(setStreak);
    chrome.runtime.sendMessage({ type: "GET_ACTIVE_PROBLEM" }).then((r) => setActive(r ?? null)).catch(() => setActive(null));
  }, []);

  const openPanel = async () => {
    await chrome.runtime.sendMessage({ type: "OPEN_PANEL" });
    window.close();
  };

  return (
    <div data-theme={theme} className="sh-root w-[300px] bg-bg text-fg">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="text-[14px] font-semibold tracking-[-0.01em]">Senior's Hint</div>
        {streak > 0 && <div className="text-[12px] text-muted">🔥 {streak} day streak</div>}
      </div>

      <div className="space-y-4 px-4 py-3.5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.06em] text-faint">Today's progress</div>
          <div className="mt-2 space-y-1.5 text-[13px]">
            <Row icon="🔥" label={`${stats?.today.attempted ?? 0} problem${stats?.today.attempted === 1 ? "" : "s"}`} />
            <Row icon="⏱" label={formatDuration(stats?.today.seconds ?? 0)} />
            <Row icon="🧠" label={`${stats?.today.independent ?? 0} independent solve${stats?.today.independent === 1 ? "" : "s"}`} />
          </div>
        </div>

        {active ? (
          <div>
            <div className="text-[11px] uppercase tracking-[0.06em] text-faint">Current problem</div>
            <div className="mt-1 truncate text-[13px] font-medium">{active.title}</div>
            <Button variant="primary" className="mt-3 w-full" onClick={openPanel}>
              Open Senior's Hint
            </Button>
          </div>
        ) : active === null ? (
          <p className="rounded-lg border border-line bg-surface px-3 py-2.5 text-[12.5px] text-muted">
            Open a LeetCode problem and I'll sit beside you.
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t border-line pt-3 text-[12px]">
          <button onClick={() => chrome.runtime.openOptionsPage()} className="text-muted hover:text-fg">
            Dashboard & settings
          </button>
          <span className="text-faint">{stats?.solved ?? 0} solved all-time</span>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 text-center">{icon}</span>
      <span>{label}</span>
    </div>
  );
}
