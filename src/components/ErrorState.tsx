import { Button } from "./ui";

export function ErrorState({
  message,
  code,
  onRetry,
  onDismiss,
  onOpenSettings,
}: {
  message: string;
  code?: string;
  onRetry: () => void;
  onDismiss: () => void;
  onOpenSettings: () => void;
}) {
  const isEmptyEditor = code === "empty";
  const isConfig = code === "config" || code === "network";
  return (
    <div className="sh-fade-in rounded-lg border border-line bg-surface p-3">
      {isEmptyEditor ? (
        <div className="text-[13px] font-medium text-fg">Nothing to debug yet.</div>
      ) : (
        <>
          <div className="text-[13px] font-medium text-fg">Senior stepped away for coffee ☕</div>
          <div className="mt-0.5 text-[12.5px] text-muted">Try again in a moment.</div>
        </>
      )}
      <div className="mt-2 font-mono text-[11px] text-faint">{message}</div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="primary" onClick={onRetry}>
          {isEmptyEditor ? "OK" : "Retry"}
        </Button>
        {isConfig && (
          <Button size="sm" variant="ghost" onClick={onOpenSettings}>
            Check backend URL
          </Button>
        )}
        {!isEmptyEditor && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}
