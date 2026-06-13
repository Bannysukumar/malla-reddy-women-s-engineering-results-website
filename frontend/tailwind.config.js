/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7C3AED",
          light: "#A78BFA",
          dark: "#6D28D9",
        },
        surface: {
          DEFAULT: "#0B1020",
          card: "#111827",
          elevated: "#1F2937",
        },
        muted: "#94A3B8",
        success: "#22C55E",
        warning: "#F59E0B",
        error: "#EF4444",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "sans-serif"],
      },
      borderRadius: {
        card: "24px",
        btn: "14px",
      },
      maxWidth: {
        content: "1440px",
      },
      spacing: {
        18: "4.5rem",
      },
      boxShadow: {
        card: "0 4px 24px -4px rgba(0, 0, 0, 0.45)",
        glow: "0 0 40px -8px rgba(124, 58, 237, 0.45)",
        glass: "0 8px 32px rgba(0, 0, 0, 0.35)",
      },
      backdropBlur: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};
