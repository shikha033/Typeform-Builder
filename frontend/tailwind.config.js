/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#2a222b",
        "ink-soft": "#3d3340",
        plum: "#2a222b",
        "plum-card": "#2f2532",
        "app-bg": "#f7f7f8",
        canvas: "#f7f7f8",
        paper: "#ffffff",
        line: "#e7e5e9",
        "line-soft": "#f1f0f2",
        slate2: "#615b64",
        mute: "#9d98a1",
        purple2: "#a45bb8",
        "purple-dim": "#c58fd4",
        "purple-soft": "#f1e2f7",
        "purple-mist": "#faf3fd",
        pink2: "#d946a3",
      },
      fontFamily: {
        display: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        hero: ["'Instrument Serif'", "Signifier", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        soft: "0 10px 40px -12px rgba(14,14,14,0.12)",
        lift: "0 24px 60px -24px rgba(14,14,14,0.28)",
        glow: "0 0 0 3px rgba(124,92,255,0.18), 0 10px 30px -14px rgba(124,92,255,0.4)",
      },
    },
  },
  plugins: [],
};
