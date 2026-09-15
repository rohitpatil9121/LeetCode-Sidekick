import { Button, Kbd } from "./ui";

/** First visit to a problem: encourage an unaided attempt. */
export function FirstVisitGate({ minutes, onStartTimer, onNudge }: { minutes: number; onStartTimer: () => void; onNudge: () => void }) {
  return (
    <div className="sh-fade-in space-y-4">
      <div>
        <div className="text-[14px] font-semibold text-fg">Before I help:</div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Spend {minutes} minutes thinking about the approach.
          <br />
          Then come back if you're stuck.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={onStartTimer}>
          Start timer
        </Button>
        <Button variant="ghost" onClick={onNudge}>
          Give me a nudge
        </Button>
      </div>
    </div>
  );
}

/** Returning, but no hint requested yet. */
export function EmptyState({ onStuck, onStartTimer }: { onStuck: () => void; onStartTimer: () => void }) {
  return (
    <div className="sh-fade-in space-y-4">
      <div>
        <div className="text-[14px] font-semibold text-fg">👋 Senior's here.</div>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Don't ask me for the answer yet.
          <br />
          Tell me what you're thinking, or take a few minutes and try it yourself.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={onStuck}>
          I'm stuck 😵
        </Button>
        <Button variant="ghost" onClick={onStartTimer}>
          Start thinking timer
        </Button>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-faint">
        <Kbd>Alt</Kbd>+<Kbd>N</Kbd> next hint · <Kbd>Esc</Kbd> minimize
      </div>
    </div>
  );
}

export function NoProblemState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="sh-fade-in space-y-3">
      <div className="text-[14px] font-semibold text-fg">I can't read this problem yet.</div>
      <p className="text-[13px] text-muted">Try refreshing the page.</p>
      <Button size="sm" onClick={onRefresh}>
        Try again
      </Button>
    </div>
  );
}
