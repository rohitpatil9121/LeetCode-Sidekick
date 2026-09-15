import type { HintApiResult, HintRequest, HintResponse } from "@/types";
import { checkSpoilers, redactSpoilers } from "@/utils/spoilerGuard";

/**
 * Content-script side of the hint API. All network traffic goes through the
 * background service worker so the page origin never talks to the backend.
 */
export async function requestHint(payload: HintRequest): Promise<HintApiResult> {
  let result: HintApiResult;
  try {
    result = await chrome.runtime.sendMessage({ type: "HINT_REQUEST", payload });
  } catch (e) {
    return { ok: false, error: (e as Error).message || "Extension messaging failed", code: "network" };
  }
  if (!result) return { ok: false, error: "No response from background worker", code: "network" };
  if (!result.ok) return result;

  // Second anti-spoiler gate. The backend already validated and retried once.
  const level = payload.request.targetLevel;
  const check = checkSpoilers(result.data.message, level, payload.request.type);
  if (!check.ok) {
    console.warn("[Senior's Hint] spoiler guard redacted a response:", check.reasons);
    const redacted: HintResponse = {
      ...result.data,
      message: redactSpoilers(result.data.message, level, payload.request.type),
      spoilerRisk: "high",
    };
    return { ok: true, data: redacted };
  }
  return result;
}

/** Runs in the background worker: the actual HTTP call. */
export async function callBackend(backendUrl: string, payload: HintRequest): Promise<HintApiResult> {
  const url = backendUrl.replace(/\/+$/, "") + "/api/hint";
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, error: "Could not reach the Senior's Hint backend.", code: "network" };
  }
  if (res.status === 503) {
    return { ok: false, error: "Backend is missing its API key. See server/.env.example.", code: "config" };
  }
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json())?.error ?? "";
    } catch {
      /* ignore */
    }
    return { ok: false, error: detail || `Backend error (${res.status})`, code: "server" };
  }
  const data = (await res.json()) as HintResponse;
  if (typeof data?.message !== "string") {
    return { ok: false, error: "Backend returned an unexpected shape.", code: "server" };
  }
  return { ok: true, data };
}
