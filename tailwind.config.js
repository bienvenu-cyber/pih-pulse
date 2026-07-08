/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        malt: {
          deep: "#0D0B05",   // Malt profond (Background de l'app)
          card: "#18140B",   // Malt clair (Surface des cartes)
          nav: "#080703",    // Malt noir (Bottom nav, Header)
          border: "#261F12", // Bordures fines chaudes
        },
        turmeric: "#FFBE0B", // Turmeric (Primary active state / CTA)
        creme: "#F5EDD6",    // Crème (Texte principal)
        sable: "#A39171",    // Sable (Texte secondaire, placeholders)
        kaki: "#7CB87A",     // Vert kaki (Succès / Validé)
        corail: "#E8634A",   // Corail (Erreurs / Danger)
      },
      fontFamily: {
        space: ["SpaceGrotesk700", "sans-serif"],
        "space-medium": ["SpaceGrotesk500", "sans-serif"],
        inter: ["Inter400", "sans-serif"],
        "inter-medium": ["Inter500", "sans-serif"],
        "inter-semibold": ["Inter600", "sans-serif"],
        "inter-bold": ["Inter700", "sans-serif"],
      },
    },
  },
  plugins: [],
}
