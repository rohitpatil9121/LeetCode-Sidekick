import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, type Settings } from "@/types";
import { loadSettings, onSettingsChange, saveSettings } from "@/utils/storage";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadSettings().then((s) => {
      if (!alive) return;
      setSettings(s);
      setLoaded(true);
    });
    const off = onSettingsChange((s) => alive && setSettings(s));
    return () => {
      alive = false;
      off();
    };
  }, []);

  const update = useCallback(async (patch: Partial<Settings>) => {
    const next = await saveSettings(patch);
    setSettings(next);
  }, []);

  return { settings, update, loaded };
}

/** Resolves "system" to a concrete theme. */
export function useResolvedTheme(appearance: Settings["appearance"]): "dark" | "light" {
  const [system, setSystem] = useState<"dark" | "light">(() =>
    window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const fn = (e: MediaQueryListEvent) => setSystem(e.matches ? "dark" : "light");
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return appearance === "system" ? system : appearance;
}
