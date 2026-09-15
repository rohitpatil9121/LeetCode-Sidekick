import { useState } from "react";
import { Check } from "./icons";
import { Button } from "./ui";

export function SolvedPrompt({ onAnalyze, onSkip }: { onAnalyze: () => void; onSkip: () => void }) {
  return (
    <div className="sh-fade-in space-y-4">
      <div>
        <div className="text-[15px] font-semibold text-fg">Solved. Nice.</div>
        <p className="mt-2 text-[13px] text-muted">
          Before you move on:
          <br />
          What's the time complexity?
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={onAnalyze}>
          Analyze complexity
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
}

export function TakeawayPrompt({ onSave }: { onSave: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <div className="sh-fade-in space-y-3">
      <div>
        <div className="text-[14px] font-semibold text-fg">Good. Now write down the key idea in one sentence.</div>
        <p className="mt-1 text-[13px] text-muted">That's how you make the pattern stick.</p>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        autoFocus
        placeholder="e.g. Remember what you've seen so you can check for the complement in one pass."
        className="w-full resize-none rounded-[8px] border border-line bg-bg px-2.5 py-2 text-[12.5px] text-fg placeholder:text-faint focus:border-accent/60 focus:outline-none"
      />
      <Button variant="primary" disabled={text.trim().length < 8} onClick={() => onSave(text.trim())}>
        Save takeaway
      </Button>
    </div>
  );
}

export function CompleteState({ takeaway, onEdgeCases, onReset }: { takeaway?: string; onEdgeCases: () => void; onReset: () => void }) {
  return (
    <div className="sh-fade-in space-y-4">
      <div className="flex items-center gap-2 text-[15px] font-semibold text-ok">
        <Check /> Problem complete
      </div>
      {takeaway && (
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="text-[11px] uppercase tracking-[0.06em] text-faint">Your takeaway</div>
          <p className="mt-1 text-[13px] text-fg">{takeaway}</p>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onEdgeCases}>
          Edge case check
        </Button>
        <Button size="sm" variant="ghost" onClick={onReset}>
          Clear session
        </Button>
      </div>
    </div>
  );
}
