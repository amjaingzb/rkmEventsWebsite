import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#FFF8EC",
        ink: "#2B1A12",
        saffron: {
          DEFAULT: "#E8871E",
          dark: "#C1440E",
        },
        maroon: {
          DEFAULT: "#6B1D1D",
          dark: "#4A1414",
        },
        gold: "#B8860B",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
