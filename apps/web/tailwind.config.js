/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#0a192f",
          "bg-light": "#112240",
          "bg-lighter": "#1a2f4a",
          cyan: "#00d4ff",
          "cyan-dim": "#00a8cc",
          lime: "#39ff14",
          "lime-dim": "#2bc40e",
          pink: "#ff006e",
          purple: "#7b2cbf",
          white: "#e6f1ff",
          "white-dim": "#8892b0",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-urgent": "pulse-urgent 0.5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
