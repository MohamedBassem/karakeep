import type { Config } from "tailwindcss";

import web from "@karakeep/tailwind-config/web";

const config = {
  content: [...(web.content as string[]), "src/**/*.astro"],
  presets: [web],
  theme: {
    extend: {
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "fade-in": "fade-in 0.8s ease-out forwards",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
      },
    },
  },
} satisfies Config;

export default config;
