/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#007AFF",
        tb: {
          base: "#13141A",
          raised: "#1C1D27",
          hover: "#262836",
          active: "#2E3145",
          border: "#2A2C3A",
          text: "#E8E9ED",
          "text-sub": "#8B8FA3",
          "text-dim": "#5C6078",
          canvas: "#0F1015",
        },
      },
      fontFamily: {
        mono: ["SF Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
