import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/renderer/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        panel: "rgb(var(--panel) / <alpha-value>)",
        panel2: "rgb(var(--panel-2) / <alpha-value>)",
        borderSoft: "var(--border-soft)",
        primaryText: "rgb(var(--text-primary) / <alpha-value>)",
        secondaryText: "rgb(var(--text-secondary) / <alpha-value>)",
        accent: "#7C3AED",
        accent2: "#6366F1"
      },
      borderRadius: {
        xl2: "20px",
        xl3: "24px"
      },
      boxShadow: {
        glow: "0 24px 80px rgba(0,0,0,0.45)",
        accent: "0 16px 48px rgba(124,58,237,0.22)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
