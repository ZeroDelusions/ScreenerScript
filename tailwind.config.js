const plugin = require('tailwindcss/plugin')

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  daisyui: {
    themes: false,
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: true,
    themeRoot: ":root"
  },
  plugins: [
    require('daisyui'),
    plugin(function({addVariant}) {
      addVariant('not-last-child', ['&>:not(:last-child)'])
    })
  ],
}

