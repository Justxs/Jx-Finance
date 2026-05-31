import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', "system-ui", "sans-serif"],
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
      },
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        accent: "var(--accent)",
        accentSoft: "var(--accent-soft)",
        line: "var(--line)",
      },
      boxShadow: {
        soft: "0 25px 60px -35px rgba(17, 24, 39, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
