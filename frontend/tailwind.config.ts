import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      "colors": {
              "on-tertiary-fixed-variant": "#7d2d00",
              "secondary-container": "#d0e1fb",
              "secondary-fixed": "#d3e4fe",
              "on-background": "#131b2e",
              "outline-variant": "#c3c6d7",
              "on-tertiary-container": "#ffede6",
              "inverse-primary": "#b4c5ff",
              "inverse-on-surface": "#eef0ff",
              "on-primary-fixed": "#00174b",
              "on-secondary-fixed-variant": "#38485d",
              "on-primary-fixed-variant": "#003ea8",
              "on-secondary-fixed": "#0b1c30",
              "surface-tint": "#0053db",
              "on-secondary-container": "#54647a",
              "primary-fixed-dim": "#b4c5ff",
              "on-error-container": "#93000a",
              "surface-container-low": "#f2f3ff",
              "tertiary-container": "#bc4800",
              "on-tertiary-fixed": "#360f00",
              "tertiary": "#943700",
              "inverse-surface": "#283044",
              "primary-container": "#2563eb",
              "background": "#faf8ff",
              "on-primary-container": "#eeefff",
              "secondary-fixed-dim": "#b7c8e1",
              "tertiary-fixed-dim": "#ffb596",
              "error-container": "#ffdad6",
              "surface-container-highest": "#dae2fd",
              "surface-container-lowest": "#ffffff",
              "tertiary-fixed": "#ffdbcd",
              "surface-dim": "#d2d9f4",
              "on-surface": "#131b2e",
              "on-surface-variant": "#434655",
              "surface-variant": "#dae2fd",
              "error": "#ba1a1a",
              "secondary": "#505f76",
              "outline": "#737686",
              "on-secondary": "#ffffff",
              "primary": "#004ac6",
              "on-primary": "#ffffff",
              "surface-container": "#eaedff",
              "surface-bright": "#faf8ff",
              "primary-fixed": "#dbe1ff",
              "surface": "#faf8ff",
              "surface-container-high": "#e2e7ff",
              "on-error": "#ffffff",
              "on-tertiary": "#ffffff"
      },
      "borderRadius": {
              "DEFAULT": "0.125rem",
              "lg": "0.25rem",
              "xl": "0.5rem",
              "full": "0.75rem"
      },
      "spacing": {
              "xl": "32px",
              "base": "4px",
              "xs": "4px",
              "lg": "24px",
              "sm": "8px",
              "gutter": "16px",
              "margin-desktop": "24px",
              "margin-mobile": "16px",
              "md": "16px"
      },
      "fontFamily": {
              "body-md": [
                      "Geist", "General Sans", "sans-serif"
              ],
              "headline-md": [
                      "Geist", "General Sans", "sans-serif"
              ],
              "label-sm": [
                      "JetBrains Mono", "monospace"
              ],
              "mono-md": [
                      "JetBrains Mono", "monospace"
              ],
              "headline-lg": [
                      "Geist", "General Sans", "sans-serif"
              ]
      },
      "fontSize": {
              "body-md": [
                      "14px",
                      {
                              "lineHeight": "20px",
                              "letterSpacing": "0",
                              "fontWeight": "400"
                      }
              ],
              "headline-md": [
                      "18px",
                      {
                              "lineHeight": "24px",
                              "letterSpacing": "-0.01em",
                              "fontWeight": "500"
                      }
              ],
              "label-sm": [
                      "11px",
                      {
                              "lineHeight": "16px",
                              "letterSpacing": "0.05em",
                              "fontWeight": "700"
                      }
              ],
              "mono-md": [
                      "13px",
                      {
                              "lineHeight": "20px",
                              "letterSpacing": "0",
                              "fontWeight": "400"
                      }
              ],
              "headline-lg": [
                      "24px",
                      {
                              "lineHeight": "32px",
                              "letterSpacing": "-0.02em",
                              "fontWeight": "600"
                      }
              ]
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-4px)" },
          "20%, 40%, 60%, 80%": { transform: "translateX(4px)" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        "glow-pulse": "glow-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in": "fade-in 0.5s ease-out",
        "shake": "shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both",
      },
    },
  },
  plugins: [],
};

export default config;
