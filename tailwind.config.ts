import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c2a33",
        calm: { 50: "#eef6f4", 100: "#d6ebe6", 500: "#2f7d6d", 600: "#256558", 700: "#1d5046" },
        warn: { 50: "#fff6e6", 500: "#c77c02", 600: "#a36400" },
        crit: { 50: "#fdecec", 500: "#c62828", 600: "#a51f1f" },
      },
    },
  },
  plugins: [],
} satisfies Config;
