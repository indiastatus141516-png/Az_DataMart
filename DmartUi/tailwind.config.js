/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    {
      pattern:
        /^(sm:|md:|lg:|xl:)?col-span-(1|2|3|4|5|6|7|8|9|10|11|12)$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1A1A2E",
        bg: {
          primary: "#F0F2F8",
          card: "#FFFFFF",
          hover: "#F5F4FF",
          sidebar: "#F7F8FF",
        },
        border: "#D9DCEF",
        accent: {
          primary: "#6C47D9",
          success: "#22C55E",
          warning: "#F59E0B",
          danger: "#EF4444",
        },
        text: {
          primary: "#1A1A2E",
          secondary: "#6B7280",
          muted: "#8A90A6",
        },
      },
      fontFamily: {
        ui: ["Sora", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        display: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 24px 60px -30px rgba(15, 18, 28, 0.75)",
        glow:
          "0 0 40px rgba(79, 142, 247, 0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
      },
    },
  },
  plugins: [],
}
