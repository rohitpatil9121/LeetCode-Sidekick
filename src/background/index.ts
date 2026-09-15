import type { HintApiResult, Message } from "@/types";
import { callBackend } from "@/services/hintApi";
import { loadSettings } from "@/utils/storage";

/**
 * Background service worker.
 *  - Proxies hint requests to the backend (the page origin never talks to it).
 *  - Relays keyboard commands to the active LeetCode tab.
 *  - Opens the options/dashboard page on request.
 */

chrome.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
  if (msg.type === "HINT_REQUEST") {
    (async () => {
      const settings = await loadSettings();
      const result: HintApiResult = await callBackend(settings.backendUrl, msg.payload);
      sendResponse(result);
    })();
    return true; // async response
  }

  if (msg.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }

  if (msg.type === "OPEN_PANEL") {
    // Popup asks us to open the panel on the active LeetCode tab.
    (async () => {
      const tab = await activeLeetCodeTab();
      if (tab?.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: "COMMAND", command: "open-panel" } satisfies Message);
        } catch {
          /* content script not present */
        }
      }
      sendResponse({ ok: !!tab });
    })();
    return true;
  }

  if (msg.type === "GET_ACTIVE_PROBLEM") {
    (async () => {
      const tab = await activeLeetCodeTab();
      const slug = tab?.url?.match(/\/problems\/([a-z0-9-]+)/i)?.[1] ?? null;
      const title = slug ? slug.split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ") : null;
      sendResponse(slug ? { id: slug, title, tabId: tab?.id } : null);
    })();
    return true;
  }

  void sender;
  return false;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-panel" && command !== "next-hint") return;
  const tab = await activeLeetCodeTab();
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "COMMAND", command } satisfies Message);
  } catch {
    /* no content script on this tab */
  }
});

async function activeLeetCodeTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url && /^https:\/\/leetcode\.(com|cn)\/problems\//.test(tab.url)) return tab;
  return undefined;
}

chrome.runtime.onInstalled.addListener(() => {
  // Nothing heavy on install; settings are lazily defaulted.
});
