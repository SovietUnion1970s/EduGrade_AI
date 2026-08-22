import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-outfit)", "sans-serif"],
      },
      colors: {
        brand: {
          bg: "#0B0F19",
          panel: "#151D30",
          accent: "#6366F1", // Indigo
          success: "#10B981", // Emerald
          warning: "#F59E0B", // Amber
          danger: "#F43F5E", // Rose
        }
      },
      boxShadow: {
        premium: "0 10px 50px -12px rgba(99, 102, 241, 0.15)",
        glass: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.05)",
      }
    },
  },
  plugins: [],
};
export default config;
