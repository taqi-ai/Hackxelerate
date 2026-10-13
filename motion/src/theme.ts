// Single source of truth for brand values. Keep in sync with assets/brand/
// and the web/mobile app theme once the product is picked.
export const theme = {
  name: "Project Name",
  tagline: "One line that says why it matters",
  colors: {
    bg: "#0B0B0F",
    fg: "#F5F5F7",
    muted: "#8A8A96",
    accent: "#7C5CFF",
    accent2: "#22D3EE",
  },
  font: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
  fps: 30,
} as const;
