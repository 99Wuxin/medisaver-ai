/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "DM Sans", "system-ui", "sans-serif"],
        display: ["Outfit", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        ink: { 950: "#0b1220", 900: "#111827", 700: "#374151", 500: "#6b7280" },
        /** MEDISAVER.AI brand navy — matches logo (#1B365D) */
        brand: {
          50: "#eef2f7",
          100: "#dce4ee",
          200: "#b8c9dc",
          400: "#4a6b8a",
          600: "#2d5a87",
          800: "#234a6f",
          950: "#1B365D"
        },
        clinic: { 50: "#f0fdf9", 100: "#ccfbf1", 400: "#2dd4bf", 600: "#0d9488", 800: "#115e59" },
        alert: { 50: "#fff7ed", 400: "#fb923c", 600: "#ea580c" }
      },
      boxShadow: {
        soft: "0 22px 60px -12px rgb(15 23 42 / 0.18)"
      }
    }
  },
  plugins: []
};
