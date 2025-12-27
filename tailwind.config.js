
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      animation: {
        fade: "fadeIn 0.3s ease-in-out",
        "slide-down": "slideDown 0.3s ease-out"
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: "translateY(10px)" },
          to: { opacity: 1, transform: "translateY(0)" }
        },
        slideDown: {
          from: { transform: "translateY(-100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" }
        }
      },
      backdropBlur: {
        xs: "2px"
      }
    }
  },
  plugins: []
}
