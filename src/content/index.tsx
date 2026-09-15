import { StrictMode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import styles from "@/styles/tailwind.css?inline";
import type { Message, ProblemInfo } from "@/types";
import { detectProblem, getProblemSlug, watchForAccepted } from "@/services/leetcode";
import { useSettings } from "@/hooks/useSettings";
import { Panel } from "@/components/Panel";

/**
 * Content script entry. Mounts the panel inside a Shadow DOM so LeetCode's
 * styles and ours never collide, and re-detects the problem on SPA navigation.
 */

const HOST_ID = "seniors-hint-host";

function App() {
  const { settings, update, loaded } = useSettings();
  const [problem, setProblem] = useState<ProblemInfo | null>(null);
  const [problemError, setProblemError] = useState(false);
  const [slug, setSlug] = useState(getProblemSlug());
  const [accepted, setAccepted] = useState(0);
  const [command, setCommand] = useState<{ command: "open-panel" | "next-hint"; n: number } | null>(null);

  const detect = useCallback(async () => {
    setProblemError(false);
    // LeetCode hydrates lazily; retry a few times before giving up.
    for (let i = 0; i < 4; i++) {
      const p = await detectProblem();
      if (p) {
        setProblem(p);
        return;
      }
      await new Promise((r) => setTimeout(r, 700 * (i + 1)));
    }
    setProblem(null);
    setProblemError(true);
  }, []);

  // SPA navigation: poll the URL cheaply instead of observing the DOM.
  useEffect(() => {
    const id = window.setInterval(() => {
      const next = getProblemSlug();
      if (next !== slug) setSlug(next);
    }, 1000);
    return () => window.clearInterval(id);
  }, [slug]);

  useEffect(() => {
    if (slug) void detect();
    else setProblem(null);
  }, [slug, detect]);

  useEffect(() => watchForAccepted(() => setAccepted((n) => n + 1)), []);

  useEffect(() => {
    const listener = (msg: Message) => {
      if (msg.type === "COMMAND") setCommand((c) => ({ command: msg.command, n: (c?.n ?? 0) + 1 }));
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  if (!loaded) return null;
  return (
    <Panel
      problem={problem}
      problemError={problemError}
      settings={settings}
      updateSettings={update}
      onRetryDetect={detect}
      acceptedSignal={accepted}
      commandSignal={command}
    />
  );
}

function mount() {
  if (document.getElementById(HOST_ID)) return;
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.all = "initial";
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = styles;
  shadow.appendChild(style);
  const mountPoint = document.createElement("div");
  shadow.appendChild(mountPoint);
  createRoot(mountPoint).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

try {
  mount();
} catch (e) {
  console.error("[Senior's Hint] failed to mount", e);
}
