import { useCallback, useEffect, useState } from "react";
import type { ProblemInfo, Settings } from "@/types";
import { useSession } from "@/hooks/useSession";
import { usePanelLayout } from "@/hooks/useDraggable";
import { useResolvedTheme } from "@/hooks/useSettings";
import { Header } from "./Header";
import { EmptyState, FirstVisitGate, NoProblemState } from "./EmptyState";
import { StuckDialog } from "./StuckDialog";
import { HintFeed, LadderRail } from "./HintLadder";
import { ThinkTimer } from "./ThinkTimer";
import { ComplexityCoach, EdgeCaseCoach } from "./Coaches";
import { CompleteState, SolvedPrompt, TakeawayPrompt } from "./SuccessState";
import { ErrorState } from "./ErrorState";
import { SettingsView } from "./SettingsView";
import { Grip } from "./icons";
import { Button, cx } from "./ui";

type View = "main" | "stuck" | "settings" | "complexity" | "edge";

export function Panel({
  problem,
  problemError,
  settings,
  updateSettings,
  onRetryDetect,
  acceptedSignal,
  commandSignal,
}: {
  problem: ProblemInfo | null;
  problemError: boolean;
  settings: Settings;
  updateSettings: (p: Partial<Settings>) => void;
  onRetryDetect: () => void;
  /** Increments when LeetCode reports an accepted submission. */
  acceptedSignal: number;
  /** Last keyboard command received from the background worker. */
  commandSignal: { command: "open-panel" | "next-hint"; n: number } | null;
}) {
  const theme = useResolvedTheme(settings.appearance);
  const { layout, update, startDrag, startResize } = usePanelLayout();
  const s = useSession(problem, settings);
  const [view, setView] = useState<View>("main");
  const [solvedPromptDismissed, setSolvedPromptDismissed] = useState(false);

  // Auto-mark solved on an accepted submission.
  useEffect(() => {
    if (acceptedSignal > 0 && s.session && !s.session.solved) {
      s.markSolved();
      update({ open: true, minimized: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptedSignal]);

  // Keyboard commands relayed from background.
  useEffect(() => {
    if (!commandSignal) return;
    if (commandSignal.command === "open-panel") update({ open: true, minimized: false });
    if (commandSignal.command === "next-hint") {
      update({ open: true, minimized: false });
      if (s.session && !s.session.solved && s.ask.status === "idle") s.nextHint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commandSignal?.n]);

  // Esc minimises when the panel has focus.
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        update({ minimized: true });
      }
    },
    [update],
  );

  if (!layout) return null;

  if (!layout.open) {
    return (
      <div data-theme={theme} className="sh-root fixed bottom-5 right-5 z-[2147483000]">
        <button
          onClick={() => update({ open: true, minimized: false })}
          className="flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-[12.5px] font-medium text-fg shadow-panel hover:bg-raised"
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-ok" />
          Senior's Hint
        </button>
      </div>
    );
  }

  const status =
    s.ask.status === "loading" ? "thinking" : s.ask.status === "error" && s.ask.code !== "empty" ? "offline" : !problem && !problemError ? "reading" : "ready";

  const session = s.session;
  const loading = s.ask.status === "loading";

  function renderBody() {
    if (problemError || (!problem && status !== "reading")) return <NoProblemState onRefresh={onRetryDetect} />;
    if (!problem || !session) return <div className="text-[12.5px] text-muted">Reading the problem…</div>;

    if (view === "settings") {
      return (
        <SettingsView
          settings={settings}
          onChange={updateSettings}
          onBack={() => setView("main")}
          onClearSession={() => {
            void s.reset();
            setView("main");
          }}
          onOpenDashboard={() => chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" })}
        />
      );
    }

    if (view === "stuck") {
      return (
        <StuckDialog
          onBack={() => setView("main")}
          onPick={(reason, note) => {
            s.stuck(reason, note);
            setView("main");
          }}
        />
      );
    }

    if (view === "complexity") {
      return (
        <ComplexityCoach
          ask={s.complexityCheck}
          onDone={() => {
            s.markComplexityDone();
            setView("main");
          }}
        />
      );
    }

    if (view === "edge") {
      return <EdgeCaseCoach ask={s.edgeCaseStep} onClose={() => setView("main")} />;
    }

    // ---- main view -------------------------------------------------------

    if (session.complete) {
      return <CompleteState takeaway={session.takeaway} onEdgeCases={() => setView("edge")} onReset={() => void s.reset()} />;
    }

    if (session.solved) {
      if (session.complexityDone) return <TakeawayPrompt onSave={s.setTakeaway} />;
      if (!solvedPromptDismissed) {
        return (
          <SolvedPrompt
            onAnalyze={() => setView("complexity")}
            onSkip={() => {
              setSolvedPromptDismissed(true);
              s.markComplexityDone();
            }}
          />
        );
      }
    }

    const error =
      s.ask.status === "error" ? (
        <ErrorState
          message={s.ask.message}
          code={s.ask.code}
          onRetry={s.ask.retry}
          onDismiss={s.dismissError}
          onOpenSettings={() => setView("settings")}
        />
      ) : null;

    const hasHints = session.hints.length > 0;

    if (!hasHints && !loading) {
      const showTimer = session.timer.running || session.timer.accumulated > 0 || session.timer.finished;
      return (
        <div className="space-y-4">
          {error}
          {showTimer && (
            <ThinkTimer
              timer={session.timer}
              onStart={s.timer.start}
              onPause={s.timer.pause}
              onReset={s.timer.reset}
              onFinish={s.timer.finish}
              onNudge={() => setView("stuck")}
            />
          )}
          {!session.hasStarted ? (
            <FirstVisitGate minutes={settings.thinkMinutes} onStartTimer={s.timer.start} onNudge={() => setView("stuck")} />
          ) : (
            !showTimer && <EmptyState onStuck={() => setView("stuck")} onStartTimer={s.timer.start} />
          )}
          {showTimer && !session.timer.finished && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setView("stuck")}>
                I'm stuck 😵
              </Button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {error}
        <HintFeed
          hints={session.hints}
          level={session.hintLevel}
          loading={loading}
          onNext={s.nextHint}
          onDebug={() => s.debugCode()}
          onStuck={() => setView("stuck")}
        />
      </div>
    );
  }

  const showFooter = !!session && !!problem && view === "main" && !session.complete;

  return (
    <div
      data-theme={theme}
      className="sh-root fixed z-[2147483000]"
      style={{ left: layout.x, top: layout.y, width: layout.width, height: layout.minimized ? 44 : layout.height }}
      onKeyDown={onKeyDown}
      tabIndex={-1}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-bg shadow-panel">
        <Header
          problemTitle={problem?.title ?? null}
          difficulty={problem?.difficulty}
          status={status}
          minimized={layout.minimized}
          onDragStart={startDrag}
          onMinimize={() => update({ minimized: !layout.minimized })}
          onSettings={() => {
            update({ minimized: false });
            setView(view === "settings" ? "main" : "settings");
          }}
          onClose={() => update({ open: false })}
        />

        {!layout.minimized && (
          <>
            {session && problem && view === "main" && !session.solved && (
              <div className="flex items-center justify-between border-b border-line bg-surface/60 px-3 py-1.5">
                <LadderRail level={session.hintLevel} />
                <span className="font-mono text-[10.5px] text-faint">{session.language}</span>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto p-3">{renderBody()}</div>

            {showFooter && (
              <div className="flex items-center justify-between border-t border-line bg-surface px-3 py-1.5">
                {session.solved ? (
                  <span className="text-[11.5px] text-ok">Solved</span>
                ) : (
                  <Button size="sm" variant="ghost" onClick={s.markSolved} title="Mark this problem as solved">
                    Mark solved
                  </Button>
                )}
                <div className="flex items-center gap-1">
                  {session.solved && !session.complete && (
                    <Button size="sm" variant="ghost" onClick={() => setView("edge")}>
                      Edge cases
                    </Button>
                  )}
                  <span className={cx("text-[11px] text-faint", session.hints.length === 0 && "opacity-0")}>
                    {session.hints.length} hint{session.hints.length === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
            )}

            <div
              onPointerDown={startResize}
              className="absolute bottom-1 left-1 cursor-nesw-resize p-1 text-faint hover:text-muted"
              aria-label="Resize"
            >
              <Grip />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
