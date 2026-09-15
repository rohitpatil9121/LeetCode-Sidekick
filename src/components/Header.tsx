import type { PointerEvent } from "react";
import { Expand, Gear, Minus, X } from "./icons";
import { IconButton, cx } from "./ui";

type Status = "ready" | "thinking" | "offline" | "reading";

const STATUS: Record<Status, { label: string; dot: string }> = {
  ready: { label: "Ready", dot: "bg-ok" },
  thinking: { label: "Thinking", dot: "bg-accent sh-pulse" },
  offline: { label: "Offline", dot: "bg-danger" },
  reading: { label: "Reading problem", dot: "bg-warn sh-pulse" },
};

export function Header({
  problemTitle,
  difficulty,
  status,
  minimized,
  onDragStart,
  onMinimize,
  onSettings,
  onClose,
}: {
  problemTitle: string | null;
  difficulty?: string;
  status: Status;
  minimized: boolean;
  onDragStart: (e: PointerEvent) => void;
  onMinimize: () => void;
  onSettings: () => void;
  onClose: () => void;
}) {
  const s = STATUS[status];
  return (
    <div
      onPointerDown={onDragStart}
      className={cx(
        "flex h-11 shrink-0 cursor-grab items-center gap-2 border-b border-line bg-surface px-3 active:cursor-grabbing select-none",
        minimized && "border-b-0",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-[13px] font-semibold tracking-[-0.01em] text-fg">Senior's Hint</span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className={cx("inline-block h-1.5 w-1.5 rounded-full", s.dot)} />
          {s.label}
        </span>
        {problemTitle && (
          <span className="ml-1 flex min-w-0 items-center gap-1.5 truncate text-[12px] text-muted">
            <span className="text-faint">/</span>
            <span className="truncate text-fg/90">{problemTitle}</span>
            {difficulty && difficulty !== "Unknown" && (
              <span
                className={cx(
                  "shrink-0 rounded-[4px] px-1 text-[10px] font-medium",
                  difficulty === "Easy" && "bg-ok/15 text-ok",
                  difficulty === "Medium" && "bg-warn/15 text-warn",
                  difficulty === "Hard" && "bg-danger/15 text-danger",
                )}
              >
                {difficulty}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <IconButton label={minimized ? "Expand" : "Minimize (Esc)"} onClick={onMinimize}>
          {minimized ? <Expand /> : <Minus />}
        </IconButton>
        <IconButton label="Settings" onClick={onSettings}>
          <Gear />
        </IconButton>
        <IconButton label="Close" onClick={onClose}>
          <X />
        </IconButton>
      </div>
    </div>
  );
}
