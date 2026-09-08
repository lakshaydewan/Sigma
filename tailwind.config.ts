import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["SF Mono", "SFMono-Regular", "ui-monospace", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        // Figma sets nearly every control in the editor at 11px/16.
        ui: ["11px", { lineHeight: "16px", letterSpacing: "0.005em" }],
        "ui-lg": ["12px", { lineHeight: "16px", letterSpacing: "0.005em" }],
        "ui-xl": ["13px", { lineHeight: "18px", letterSpacing: "0.005em" }],
      },
      colors: {
        figma: {
          toolbar: "#2c2c2c",
          "toolbar-hover": "#383838",
          menu: "#1e1e1e",
          "menu-hover": "#383838",
          panel: "#ffffff",
          canvas: "#f5f5f5",
          border: "#e6e6e6",
          "border-strong": "#d9d9d9",
          hover: "#f5f5f5",
          text: "#1e1e1e",
          "text-secondary": "#757575",
          "text-tertiary": "#b3b3b3",
          "on-dark": "#ffffff",
          "on-dark-secondary": "#b3b3b3",
          blue: "#0d99ff",
          "blue-hover": "#007be5",
          "blue-wash": "#e5f4ff",
          danger: "#f24822",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
      },
      boxShadow: {
        // Figma's two elevations: a hairline-plus-shadow for menus, softer for panels.
        "figma-menu": "0 2px 14px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.2)",
        "figma-panel": "0 2px 7px rgba(0,0,0,0.15), 0 0 0 0.5px rgba(0,0,0,0.1)",
        "figma-pin": "0 2px 6px rgba(0,0,0,0.25)",
      },
      borderRadius: {
        figma: "5px",
        "figma-sm": "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
