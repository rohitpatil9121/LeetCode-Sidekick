# Senior's Hint — LeetCode Sidekick

A Chrome extension that sits beside you on LeetCode like a senior developer. It gives progressively stronger hints, never the solution.

```
Think → Nudge → Approach → Key Insight → Pseudocode → Debug
```

**Learning > Speed. Understanding > Answers. Independence > AI dependency.**

## What it does

- Detects the problem you're on and reads title, description, examples, and constraints.
- A floating, draggable, resizable panel with a five-rung hint ladder. Each rung reveals a little more. The ladder locks at pseudocode.
- **I'm stuck** asks where you're stuck and lands you on the matching rung instead of the strongest hint.
- **Debug my code** reads your editor (only when you ask) and points at the smallest useful mistake.
- **Complexity coach** and **edge-case coach** ask questions instead of listing answers.
- Optional think timer before the first nudge.
- Anti-spoiler guard on both server and client. Technique names, big-O, and code are blocked until the level allows them.
- Local progress tracking, hint-dependency breakdown, and a quiet daily streak.
- Keyboard shortcuts: `Alt+H` open, `Alt+N` next hint, `Esc` minimize.

## Architecture

```
src/
├── background/   service worker: proxies API calls, relays shortcuts
├── content/      panel mount (Shadow DOM) + MAIN-world Monaco bridge
├── components/   panel UI
├── hooks/        session, layout, settings, timer
├── services/     LeetCode adapter, hint API, progress
├── utils/        storage, spoiler guard, text parsing
├── types/
├── styles/
├── popup/        toolbar popup
└── dashboard/    options page: stats + settings
server/           Express backend holding the Anthropic API key
```

The extension never holds an API key. It talks to `server/`, which talks to Anthropic.

## Setup

### 1. Backend

```bash
cd server
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm install
npm run dev               # http://localhost:8787
```

Check it: `curl http://localhost:8787/health`

### 2. Extension

```bash
npm install
npm run build             # outputs dist/
```

Then in Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → pick `dist/`.

For development with hot reload use `npm run dev` and load `dist/` the same way.

The backend URL defaults to `http://localhost:8787`. Change it in the panel's settings, in the dashboard, or at build time via `.env` (`VITE_BACKEND_URL`). If you host the backend elsewhere, also add its origin to `host_permissions` in `manifest.config.ts`.

### 3. Shortcuts

Chrome may not bind `Alt+H` / `Alt+N` if they conflict. Set them at `chrome://extensions/shortcuts`.

## Privacy

- Problem text is sent to the backend only when you request a hint.
- Your code is sent only when you request debugging help.
- Progress, sessions, and layout live in `chrome.storage` on your machine. **Clear session** and **Clear all local data** wipe them.

## Adding another platform

`src/services/leetcode.ts` is the only file that knows about LeetCode's DOM and GraphQL. Implement the same three functions (`getProblemSlug`, `detectProblem`, `readEditor`) for another site, add its match pattern to `manifest.config.ts`, and the rest of the extension works unchanged.
