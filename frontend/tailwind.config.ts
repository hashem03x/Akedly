import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0b0c",
        surface: "#141416",
        "surface-hover": "#1b1b1e",
        border: "#26262a",
        ink: "#f5f3ee",
        muted: "#9a9a9f",
        accent: "#e2481e",
        "accent-hover": "#c93c17",
        success: "#3fae64",
        danger: "#d94f4f",
        warning: "#c98a2e",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
