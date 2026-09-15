import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Senior's Hint — LeetCode Sidekick",
  short_name: "Senior's Hint",
  description:
    "A senior developer beside you on LeetCode. Progressive hints that never spoil the solution.",
  version: pkg.version,
  icons: {
    16: "public/icons/icon16.png",
    32: "public/icons/icon32.png",
    48: "public/icons/icon48.png",
    128: "public/icons/icon128.png",
  },
  action: {
    default_popup: "popup.html",
    default_title: "Senior's Hint",
  },
  options_page: "dashboard.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["https://leetcode.com/problems/*", "https://leetcode.cn/problems/*"],
      js: ["src/content/index.tsx"],
      run_at: "document_idle",
    },
    {
      matches: ["https://leetcode.com/problems/*", "https://leetcode.cn/problems/*"],
      js: ["src/content/editorBridge.ts"],
      run_at: "document_idle",
      world: "MAIN",
    },
  ],
  permissions: ["storage", "activeTab"],
  host_permissions: ["http://localhost:8787/*", "https://leetcode.com/*"],
  commands: {
    "open-panel": {
      suggested_key: { default: "Alt+H" },
      description: "Open Senior's Hint",
    },
    "next-hint": {
      suggested_key: { default: "Alt+N" },
      description: "Next hint",
    },
  },
});
