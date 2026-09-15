import { useState } from "react";
import type { StuckReason } from "@/types";
import { ArrowLeft } from "./icons";
import { Button, cx } from "./ui";

const OPTIONS: { value: StuckReason; label: string; hint: string }[] = [
  { value: "understanding", label: "Understanding the problem", hint: "I'll re-explain what's being asked, nothing more." },
  { value: "approach", label: "Choosing an approach", hint: "A directional nudge. No data structures named." },
  { value: "insight", label: "Finding the key insight", hint: "The observation that unlocks it." },
  { value: "logic", label: "Writing the logic", hint: "Language-independent pseudocode." },
  { value: "debugging", label: "Debugging my code", hint: "I'll read your editor and point at the smallest mistake." },
];

export function StuckDialog({ onPick, onBack }: { onPick: (reason: StuckReason, note?: string) => void; onBack: () => void }) {
  const [reason, setReason] = useState<StuckReason | null>(null);
  const [note, setNote] = useState("");

  return (
    <div className="sh-fade-in space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-muted hover:text-fg" aria-label="Back">
          <ArrowLeft />
        </button>
        <div className="text-[14px] font-semibold text-fg">Where are you stuck?</div>
      </div>

      <div role="radiogroup" className="space-y-1">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={reason === o.value}
            onClick={() => setReason(o.value)}
            className={cx(
              "flex w-full items-start gap-2.5 rounded-[8px] border px-3 py-2 text-left transition-colors",
              reason === o.value ? "border-accent/60 bg-accent/10" : "border-line bg-surface hover:bg-raised",
            )}
          >
            <span
              className={cx(
                "mt-[5px] inline-block h-3 w-3 shrink-0 rounded-full border",
                reason === o.value ? "border-accent bg-accent" : "border-faint",
              )}
            />
            <span className="min-w-0">
              <span className="block text-[13px] text-fg">{o.label}</span>
              {reason === o.value && <span className="block text-[11.5px] text-muted">{o.hint}</span>}
            </span>
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Optional: what have you tried or considered so far?"
        className="w-full resize-none rounded-[8px] border border-line bg-bg px-2.5 py-2 text-[12.5px] text-fg placeholder:text-faint focus:border-accent/60 focus:outline-none"
      />

      <div className="flex justify-end">
        <Button variant="primary" disabled={!reason} onClick={() => reason && onPick(reason, note.trim() || undefined)}>
          Help me here
        </Button>
      </div>
    </div>
  );
}
