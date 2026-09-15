import { useEffect, useRef } from "react";
import type { HintLevel, HintRecord } from "@/types";
import { HINT_LEVEL_NAMES, MAX_LADDER_LEVEL } from "@/types";
import { ArrowRight, Bug, Check, Lock } from "./icons";
import { Button, Prose, cx } from "./ui";

const LADDER: HintLevel[] = [0, 1, 2, 3, 4];

/** Compact ladder rail showing where the user is. */
export function LadderRail({ level }: { level: HintLevel | -1 }) {
  return (
    <div className="flex items-center gap-1 overflow-hidden" aria-label={`Hint level ${level < 0 ? "none" : HINT_LEVEL_NAMES[level as HintLevel]}`}>
      {LADDER.map((l) => (
        <div key={l} className="flex items-center gap-1">
          <div
            title={HINT_LEVEL_NAMES[l]}
            className={cx(
              "flex h-5 items-center whitespace-nowrap rounded-[5px] px-1.5 text-[10.5px] font-medium transition-colors",
              l <= level ? "bg-fg text-bg" : l === level + 1 ? "border border-line text-muted" : "text-faint",
            )}
          >
            {HINT_LEVEL_NAMES[l]}
          </div>
          {l < MAX_LADDER_LEVEL && <span className="text-faint">·</span>}
        </div>
      ))}
    </div>
  );
}

const TYPE_LABEL: Record<HintRecord["requestType"], string> = {
  next_hint: "",
  explain_problem: "Problem, restated",
  debug_code: "Debug",
  complexity_check: "Complexity",
  edge_case_check: "Edge cases",
};

export function HintCard({ hint, latest }: { hint: HintRecord; latest: boolean }) {
  const isLadder = hint.requestType === "next_hint";
  const badge = isLadder ? HINT_LEVEL_NAMES[hint.hintLevel] : TYPE_LABEL[hint.requestType];
  return (
    <article className={cx("rounded-lg border bg-surface p-3", latest ? "border-line sh-fade-in" : "border-line/70 opacity-80")}>
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className={cx(
            "inline-flex h-5 items-center gap-1 rounded-[5px] px-1.5 font-mono text-[10.5px] font-medium",
            isLadder ? "bg-raised text-muted" : "bg-accent/10 text-accent",
          )}
        >
          {hint.requestType === "debug_code" && <Bug width={11} height={11} />}
          {isLadder && `L${hint.hintLevel} · `}
          {badge}
        </span>
        <span className="truncate text-[13px] font-semibold text-fg">{hint.title}</span>
        {hint.verdict && (
          <span
            className={cx(
              "ml-auto inline-flex items-center gap-1 text-[11px]",
              hint.verdict === "correct" ? "text-ok" : hint.verdict === "partial" ? "text-warn" : "text-danger",
            )}
          >
            {hint.verdict === "correct" && <Check width={12} height={12} />}
            {hint.verdict}
          </span>
        )}
      </div>
      <Prose text={hint.message} />
      {hint.nextAction && (
        <div className="mt-2.5 flex items-start gap-1.5 rounded-[8px] bg-raised/70 px-2.5 py-2 text-[12px] text-muted">
          <ArrowRight className="mt-[3px] shrink-0" width={12} height={12} />
          <span>{hint.nextAction}</span>
        </div>
      )}
    </article>
  );
}

export function HintFeed({
  hints,
  level,
  loading,
  onNext,
  onDebug,
  onStuck,
}: {
  hints: HintRecord[];
  level: HintLevel | -1;
  loading: boolean;
  onNext: () => void;
  onDebug: () => void;
  onStuck: () => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [hints.length, loading]);

  const atTop = level >= MAX_LADDER_LEVEL;

  return (
    <div className="space-y-2.5">
      {hints.map((h, i) => (
        <HintCard key={h.id} hint={h} latest={i === hints.length - 1} />
      ))}

      {loading && <ThinkingCard />}

      {!loading && (
        <div className="space-y-2 pt-1">
          {atTop ? (
            <div className="sh-fade-in rounded-lg border border-dashed border-line px-3 py-2.5 text-[13px] text-fg">
              <span className="font-medium">You've got enough to code it.</span> Go cook. 🔥
              <div className="mt-1 flex items-center gap-1 text-[12px] text-muted">
                <Lock width={11} height={11} /> Ladder locked. Debugging stays open.
              </div>
            </div>
          ) : (
            <Button variant="primary" className="w-full" onClick={onNext}>
              Need another nudge <ArrowRight />
            </Button>
          )}
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={onDebug}>
              <Bug /> Debug my code
            </Button>
            <Button size="sm" variant="ghost" className="flex-1" onClick={onStuck}>
              I'm stuck elsewhere
            </Button>
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

export function ThinkingCard({ label = "Senior's thinking…" }: { label?: string }) {
  return (
    <div className="sh-fade-in flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2.5 text-[12.5px] text-muted">
      <span className="sh-pulse inline-block h-1.5 w-1.5 rounded-full bg-accent" />
      {label}
    </div>
  );
}
