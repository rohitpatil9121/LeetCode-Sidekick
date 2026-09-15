import { useState } from "react";
import type { Appearance, DefaultLanguage, Personality, Settings, Strictness } from "@/types";
import { ArrowLeft } from "./icons";
import { Button, Divider, Label, Segmented } from "./ui";

const LANGS: { value: DefaultLanguage; label: string }[] = [
  { value: "python", label: "Python" },
  { value: "cpp", label: "C++" },
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
];

export function SettingsForm({
  settings,
  onChange,
  compact,
  onClearSession,
  onClearAll,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  compact?: boolean;
  onClearSession?: () => void;
  onClearAll?: () => void;
}) {
  const [url, setUrl] = useState(settings.backendUrl);
  const [confirmAll, setConfirmAll] = useState(false);

  return (
    <div className="space-y-4">
      <Row label="Senior personality" hint="How much edge in the voice.">
        <Segmented<Personality>
          value={settings.personality}
          onChange={(v) => onChange({ personality: v })}
          options={[
            { value: "chill", label: "Chill" },
            { value: "balanced", label: "Balanced" },
            { value: "strict", label: "Strict" },
          ]}
        />
      </Row>

      <Row label="Hint strictness" hint="How much is revealed per rung.">
        <Segmented<Strictness>
          value={settings.strictness}
          onChange={(v) => onChange({ strictness: v })}
          options={[
            { value: "socratic", label: "Very Socratic" },
            { value: "balanced", label: "Balanced" },
            { value: "direct", label: "More direct" },
          ]}
        />
      </Row>

      <Row label="Default language" hint="Used when the editor language can't be read.">
        <select
          value={settings.defaultLanguage}
          onChange={(e) => onChange({ defaultLanguage: e.target.value as DefaultLanguage })}
          className="h-7 rounded-[8px] border border-line bg-bg px-2 text-[12.5px] text-fg focus:border-accent/60 focus:outline-none"
        >
          {LANGS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
      </Row>

      <Row label="Appearance">
        <Segmented<Appearance>
          value={settings.appearance}
          onChange={(v) => onChange({ appearance: v })}
          options={[
            { value: "dark", label: "Dark" },
            { value: "light", label: "Light" },
            { value: "system", label: "System" },
          ]}
        />
      </Row>

      <Row label="Think timer" hint="Minutes before the first nudge is suggested.">
        <input
          type="number"
          min={1}
          max={60}
          value={settings.thinkMinutes}
          onChange={(e) => onChange({ thinkMinutes: Math.max(1, Math.min(60, Number(e.target.value) || 5)) })}
          className="h-7 w-16 rounded-[8px] border border-line bg-bg px-2 text-[12.5px] text-fg focus:border-accent/60 focus:outline-none"
        />
      </Row>

      <Divider />

      <Row label="Backend URL" hint="Your Senior's Hint server. The API key lives there, never here.">
        <div className="flex w-full gap-1.5">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => url !== settings.backendUrl && onChange({ backendUrl: url.trim() })}
            spellCheck={false}
            className="h-7 min-w-0 flex-1 rounded-[8px] border border-line bg-bg px-2 font-mono text-[12px] text-fg focus:border-accent/60 focus:outline-none"
          />
          {url !== settings.backendUrl && (
            <Button size="sm" onClick={() => onChange({ backendUrl: url.trim() })}>
              Save
            </Button>
          )}
        </div>
      </Row>

      <Divider />

      <div className="space-y-2">
        <Label>Privacy</Label>
        <p className="text-[12px] leading-relaxed text-muted">
          Your code is only sent to the AI when you request debugging help. Problem text is sent only when you ask for a hint.
          Progress stays in this browser.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {onClearSession && (
            <Button size="sm" onClick={onClearSession}>
              Clear session
            </Button>
          )}
          {onClearAll && !compact && (
            confirmAll ? (
              <>
                <Button size="sm" variant="danger" onClick={onClearAll}>
                  Yes, delete everything
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmAll(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button size="sm" variant="danger" onClick={() => setConfirmAll(true)}>
                Clear all local data
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div>
        <Label>{label}</Label>
        {hint && <div className="text-[11.5px] text-faint">{hint}</div>}
      </div>
      <div className="flex items-center">{children}</div>
    </div>
  );
}

/** In-panel settings view. */
export function SettingsView({
  settings,
  onChange,
  onBack,
  onClearSession,
  onOpenDashboard,
}: {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
  onClearSession: () => void;
  onOpenDashboard: () => void;
}) {
  return (
    <div className="sh-fade-in space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-muted hover:text-fg" aria-label="Back">
          <ArrowLeft />
        </button>
        <div className="text-[14px] font-semibold text-fg">Settings</div>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={onOpenDashboard}>
          Open dashboard
        </Button>
      </div>
      <SettingsForm settings={settings} onChange={onChange} compact onClearSession={onClearSession} />
    </div>
  );
}
