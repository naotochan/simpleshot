/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "rgb(var(--tb-selected) / <alpha-value>)",
        tb: {
          base: "rgb(var(--tb-base) / <alpha-value>)",
          raised: "rgb(var(--tb-raised) / <alpha-value>)",
          hover: "rgb(var(--tb-hover) / <alpha-value>)",
          active: "rgb(var(--tb-active) / <alpha-value>)",
          border: "rgb(var(--tb-border) / <alpha-value>)",
          text: "rgb(var(--tb-text) / <alpha-value>)",
          "text-sub": "rgb(var(--tb-text-sub) / <alpha-value>)",
          "text-dim": "rgb(var(--tb-text-dim) / <alpha-value>)",
          canvas: "rgb(var(--tb-canvas) / <alpha-value>)",
          selected: "rgb(var(--tb-selected) / <alpha-value>)",
          success: "rgb(var(--tb-success) / <alpha-value>)",
          warning: "rgb(var(--tb-warning) / <alpha-value>)",
          danger: "rgb(var(--tb-danger) / <alpha-value>)",
        },
      },
      fontFamily: {
        mono: ["SF Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
