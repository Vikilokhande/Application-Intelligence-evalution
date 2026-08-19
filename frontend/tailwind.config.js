/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        field: "#F7F9F8",
        line: "#D9E2DD",
        pine: "#176B5B",
        saffron: "#B7791F",
        brick: "#B42318",
        cobalt: "#3157A4"
      }
    }
  },
  plugins: []
};

