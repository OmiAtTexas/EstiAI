import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0d1117",
        surface: "#161b27",
        "surface-hover": "#1e2538",
        "surface-active": "#252d47",
        accent: "#f59e0b",
        "accent-dark": "#d97706",
        border: "rgba(255,255,255,0.08)",
        "t-primary": "#e8e8e8",
        "t-secondary": "#8b8fa8",
        "t-muted": "#4a5068",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      keyframes: {
        blink: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        dot: {
          "0%,80%,100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        fadein: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        dot: "dot 1.4s ease-in-out infinite",
        fadein: "fadein 0.2s ease-out",
      },
    },
  },
  plugins: [],
}

export default config
