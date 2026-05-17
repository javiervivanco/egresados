/** @type {import('tailwindcss').Config} */
// Reutiliza la paleta forestal del frontend público (ver ../tailwind.config.js).
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
        serif: ["Montserrat", "sans-serif"],
      },
      colors: {
        pino:   { DEFAULT: "#2D5A27", light: "#E5EFE3", mid: "#558E4F" },
        hojas:  { DEFAULT: "#8EB69B", light: "#E8F1EB", mid: "#A5C5B0" },
        fogata: { DEFAULT: "#F4A261", light: "#FCEBD9", mid: "#F7B989" },
        tierra: { DEFAULT: "#E76F51", light: "#FBDCD3", mid: "#EE9684" },
        noche:  { DEFAULT: "#264653", light: "#DCE3E6", mid: "#4A6B79" },
      },
    },
  },
  plugins: [],
};
