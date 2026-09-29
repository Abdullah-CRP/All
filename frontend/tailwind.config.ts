import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#F5F5F0",
          warm: "#EDE8E1",
          card: "#FCFCFA",
        },
        espresso: {
          50: "#EFEBE9",
          100: "#D7CCC8",
          200: "#BCAAA4",
          300: "#A1887F",
          400: "#8D6E63",
          500: "#795548",
          600: "#6D4C41",
          700: "#5D4037",
          800: "#4E342E",
          900: "#3E2723",
          950: "#271714",
          DEFAULT: "#3E2723",
        },
        stone: {
          100: "#F5F5F0",
          200: "#E8E6DF",
          300: "#D6D2C9",
          400: "#B5AFA2",
          500: "#8D6E63",
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
      boxShadow: {
        subtle: "0 4px 20px -2px rgba(62, 39, 35, 0.05)",
        card: "0 10px 30px -4px rgba(62, 39, 35, 0.08)",
        magnetic: "0 12px 35px -5px rgba(62, 39, 35, 0.18)",
      },
      backdropBlur: {
        glass: "12px",
      }
    },
  },
  plugins: [],
};
export default config;
