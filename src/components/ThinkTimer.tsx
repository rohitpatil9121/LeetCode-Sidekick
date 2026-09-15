import { useEffect } from "react";
import type { TimerState } from "@/types";
import { useTimerTick } from "@/hooks/useTimer";
import { formatClock } from "@/utils/text";
import { Pause, Play, Rotate } from "./icons";
import { Button, IconButton, cx } from "./ui";

export function ThinkTimer({
  timer,
  onStart,
  onPause,
  onReset,
  onFinish,
  onNudge,
}: {
  timer: TimerState;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onFinish: () => void;
  onNudge: () => void;
}) {
  const elapsed = useTimerTick(timer);
  const remaining = Math.max(0, timer.target - elapsed);
  const pct = Math.min(1, elapsed / timer.target);

  useEffect(() => {
    if (timer.running && remaining <= 0) onFinish();
  }, [remaining, timer.running, onFinish]);

  if (timer.finished) {
    return (
      <div className="sh-fade-in rounded-lg border border-line bg-surface p-3">
        <div className="text-[13px] font-medium text-fg">Still stuck?</div>
        <div className="mt-0.5 text-[12.5px] text-muted">Senior's got you.</div>
        <div className="mt-3 flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={onNudge}>
            Get a nudge
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>
            <Rotate /> Think again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.06em] text-faint">Think time</div>
          <div className={cx("mt-0.5 font-mono text-[22px] tabular-nums leading-none", timer.running ? "text-fg" : "text-muted")}>
            {formatClock(remaining)}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {timer.running ? (
            <IconButton label="Pause" onClick={onPause}>
              <Pause />
            </IconButton>
          ) : (
            <IconButton label={elapsed > 0 ? "Resume" : "Start"} onClick={onStart}>
              <Play />
            </IconButton>
          )}
          <IconButton label="Reset" onClick={onReset}>
            <Rotate />
          </IconButton>
        </div>
      </div>
      <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-raised">
        <div className="h-full rounded-full bg-accent transition-[width] duration-1000 ease-linear" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
