import { useEffect, useState } from "react";
import type { TimerState } from "@/types";
import { timerElapsed } from "@/services/session";

/** Ticks once a second while running; returns elapsed seconds. */
export function useTimerTick(timer: TimerState): number {
  const [elapsed, setElapsed] = useState(() => timerElapsed(timer));
  useEffect(() => {
    setElapsed(timerElapsed(timer));
    if (!timer.running) return;
    const id = window.setInterval(() => setElapsed(timerElapsed(timer)), 1000);
    return () => window.clearInterval(id);
  }, [timer]);
  return elapsed;
}
