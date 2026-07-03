/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        malt: {
          deep: "#2A2312",  // Malt profond (Background)
          light: "#3D3118", // Malt clair (Surface)
          dark: "#1A150A",  // Malt noir (Nav/Overlay)
        },
        turmeric: "#FFBE0B", // Turmeric (Primary/CTA)
        creme: "#F5EDD6",    // Crème (Texte principal)
        sable: "#A89060",    // Sable (Texte secondaire)
        kaki: "#7CB87A",     // Vert kaki (Succès)
        corail: "#E8634A",   // Corail (Danger)
      },
    },
  },
  plugins: [],
}
