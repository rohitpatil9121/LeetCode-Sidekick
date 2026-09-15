/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./popup.html", "./dashboard.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Menlo", "Consolas", "monospace"],
      },
      colors: {
        bg: "rgb(var(--sh-bg) / <alpha-value>)",
        surface: "rgb(var(--sh-surface) / <alpha-value>)",
        raised: "rgb(var(--sh-raised) / <alpha-value>)",
        line: "rgb(var(--sh-line) / <alpha-value>)",
        fg: "rgb(var(--sh-fg) / <alpha-value>)",
        muted: "rgb(var(--sh-muted) / <alpha-value>)",
        faint: "rgb(var(--sh-faint) / <alpha-value>)",
        accent: "rgb(var(--sh-accent) / <alpha-value>)",
        ok: "rgb(var(--sh-ok) / <alpha-value>)",
        warn: "rgb(var(--sh-warn) / <alpha-value>)",
        danger: "rgb(var(--sh-danger) / <alpha-value>)",
      },
      borderRadius: { md: "10px", lg: "12px" },
      boxShadow: {
        panel: "0 8px 30px rgba(0,0,0,0.35), 0 1px 0 rgba(255,255,255,0.04) inset",
        card: "0 1px 2px rgba(0,0,0,0.2)",
      },
    },
  },
  plugins: [],
};
