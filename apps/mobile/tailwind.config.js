/**
 * Web-only Tailwind config. Used solely to compile `globals.css` for the
 * `"use dom"` webview component (BookmarkHtmlHighlighterDom). The native app
 * itself styles with React Native StyleSheet — no nativewind.
 *
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: [
    "./components/bookmarks/BookmarkHtmlHighlighterDom.tsx",
    "../../packages/shared-react/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: withOpacity("border"),
        input: withOpacity("input"),
        ring: withOpacity("ring"),
        background: withOpacity("background"),
        foreground: withOpacity("foreground"),
        primary: {
          DEFAULT: withOpacity("primary"),
          foreground: withOpacity("primary-foreground"),
        },
        secondary: {
          DEFAULT: withOpacity("secondary"),
          foreground: withOpacity("secondary-foreground"),
        },
        destructive: {
          DEFAULT: withOpacity("destructive"),
          foreground: withOpacity("destructive-foreground"),
        },
        muted: {
          DEFAULT: withOpacity("muted"),
          foreground: withOpacity("muted-foreground"),
        },
        accent: {
          DEFAULT: withOpacity("accent"),
          foreground: withOpacity("accent-foreground"),
        },
        popover: {
          DEFAULT: withOpacity("popover"),
          foreground: withOpacity("popover-foreground"),
        },
        card: {
          DEFAULT: withOpacity("card"),
          foreground: withOpacity("card-foreground"),
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return `rgb(var(--${variableName}) / ${opacityValue})`;
    }
    return `rgb(var(--${variableName}))`;
  };
}
