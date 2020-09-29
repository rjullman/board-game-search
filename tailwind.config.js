module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  purge: ["./pages/**/*.tsx", "./components/**/*.tsx"],
  theme: {
    extend: {
      transitionProperty: {
        height: "height",
      },
    },
  },
  variants: { padding: ["responsive", "first", "last"] },
  plugins: [require("@tailwindcss/custom-forms")],
};
