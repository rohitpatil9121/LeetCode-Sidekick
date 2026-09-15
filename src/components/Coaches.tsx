import { useState } from "react";
import type { HintResponse } from "@/types";
import { Check } from "./icons";
import { Button, Prose } from "./ui";
import { ThinkingCard } from "./HintLadder";

const COMPLEXITY_OPTIONS = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "Not sure"];

/** Turns complexity analysis into an active step. */
export function ComplexityCoach({
  ask,
  onDone,
}: {
  ask: (answer: string) => Promise<HintResponse | null>;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HintResponse | null>(null);

  const pick = async (answer: string) => {
    setBusy(true);
    const r = await ask(answer);
    setBusy(false);
    if (r) setResult(r);
  };

  return (
    <div className="sh-fade-in space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-[0.06em] text-faint">Complexity check</div>
        <div className="mt-1 text-[14px] font-semibold text-fg">What's your expected time complexity?</div>
      </div>

      {!result && !busy && (
        <div className="grid grid-cols-3 gap-1.5">
          {COMPLEXITY_OPTIONS.map((o) => (
            <Button key={o} size="sm" className="font-mono" onClick={() => pick(o)}>
              {o}
            </Button>
          ))}
        </div>
      )}

      {busy && <ThinkingCard label="Checking your reasoning…" />}

      {result && (
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-fg">
            {result.verdict === "correct" && <Check className="text-ok" />}
            {result.title}
          </div>
          <Prose text={result.message} />
          <div className="mt-3 flex gap-2">
            {result.verdict !== "correct" && (
              <Button size="sm" onClick={() => setResult(null)}>
                Try again
              </Button>
            )}
            <Button size="sm" variant="primary" onClick={onDone}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Asks about edge cases one at a time instead of listing them. */
export function EdgeCaseCoach({
  ask,
  onClose,
}: {
  ask: (step: number, answer?: string) => Promise<HintResponse | null>;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<HintResponse | null>(null);
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState<HintResponse[]>([]);

  const begin = async () => {
    setBusy(true);
    const r = await ask(0);
    setBusy(false);
    if (r) setCurrent(r);
  };

  const submit = async () => {
    if (!current) return;
    setBusy(true);
    const r = await ask(step + 1, answer.trim() || "(no answer)");
    setBusy(false);
    setHistory((h) => [...h, current]);
    setAnswer("");
    setStep((s) => s + 1);
    if (r) setCurrent(r);
  };

  return (
    <div className="sh-fade-in space-y-3">
      <div>
        <div className="text-[11px] uppercase tracking-[0.06em] text-faint">Edge case check</div>
        <div className="mt-1 text-[14px] font-semibold text-fg">Let's poke at the boundaries.</div>
      </div>

      {history.map((h, i) => (
        <div key={i} className="rounded-lg border border-line/60 bg-surface/60 p-2.5 text-[12px] text-muted">
          <Prose text={h.message} />
        </div>
      ))}

      {!current && !busy && (
        <Button variant="primary" onClick={begin}>
          Start
        </Button>
      )}
      {busy && <ThinkingCard />}

      {current && !busy && (
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="mb-1.5 text-[13px] font-semibold text-fg">{current.title}</div>
          <Prose text={current.message} />
          {current.done ? (
            <div className="mt-3">
              <Button size="sm" variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                rows={2}
                placeholder="Your answer, in a sentence."
                className="w-full resize-none rounded-[8px] border border-line bg-bg px-2.5 py-2 text-[12.5px] text-fg placeholder:text-faint focus:border-accent/60 focus:outline-none"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={submit}>
                  Check
                </Button>
                <Button size="sm" variant="ghost" onClick={onClose}>
                  Stop here
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
