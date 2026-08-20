/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Professional Government & Enterprise Light Palette
        govbg: {
          canvas: "#F8FAFC",
          sidebar: "#FFFFFF",
          surface: "#FFFFFF",
          elevated: "#F1F5F9",
          input: "#FFFFFF",
        },
        govborder: {
          subtle: "#E2E8F0",
          medium: "#CBD5E1",
          active: "#0D9488",
        },
        govtext: {
          heading: "#0F172A",
          primary: "#1E293B",
          secondary: "#475569",
          label: "#64748B",
          muted: "#94A3B8",
        },
        govbrand: {
          dark: "#0F766E",
          teal: "#0D9488",
          light: "#CCFBF1",
          navy: "#1E3A8A",
        },

        // Backward compatibility mappings for existing page components
        ink: "#0F172A",
        field: "#FFFFFF",
        line: "#E2E8F0",
        pine: "#0D9488",
        saffron: "#D97706",
        brick: "#DC2626",
        cobalt: "#0284C7"
      }
    }
  },
  plugins: []
};





