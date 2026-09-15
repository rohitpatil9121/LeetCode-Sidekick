import type { ButtonHTMLAttributes, ReactNode } from "react";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-1.5 rounded-[8px] font-medium select-none transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-fg text-bg hover:bg-fg/90 active:bg-fg/80",
  secondary: "bg-raised text-fg border border-line hover:bg-line/60 active:bg-line",
  ghost: "text-muted hover:text-fg hover:bg-raised",
  danger: "text-danger hover:bg-danger/10",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12px]",
  md: "h-8 px-3 text-[13px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={cx(base, variants[variant], sizes[size], className)} {...rest} />;
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-muted hover:text-fg hover:bg-raised transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] items-center rounded-[4px] border border-line bg-raised px-1.5 font-mono text-[10.5px] text-muted">
      {children}
    </kbd>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex rounded-[8px] border border-line bg-bg p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-6 rounded-[6px] px-2.5 text-[12px] transition-colors",
            value === o.value ? "bg-raised text-fg shadow-card" : "text-muted hover:text-fg",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Divider() {
  return <div className="h-px w-full bg-line" />;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-faint">{children}</div>;
}

/** Renders hint text with light inline formatting: `code`, fenced blocks, paragraphs. */
export function Prose({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g).filter(Boolean);
  return (
    <div className="sh-prose space-y-2 text-[13px] leading-[1.55] text-fg">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const body = part.replace(/^```\w*\n?/, "").replace(/```$/, "");
          return (
            <pre key={i}>
              <code>{body.trimEnd()}</code>
            </pre>
          );
        }
        return part
          .split(/\n{2,}/)
          .filter((p) => p.trim())
          .map((para, j) => <p key={`${i}-${j}`}>{inline(para)}</p>);
      })}
    </div>
  );
}

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[1] !== undefined) out.push(<code key={k++}>{m[1]}</code>);
    else out.push(<strong key={k++} className="font-semibold">{m[2]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export { cx };
