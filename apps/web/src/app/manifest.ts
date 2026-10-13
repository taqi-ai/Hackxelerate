import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ascora",
    short_name: "Ascora",
    description: "From early warning to real intervention.",
    start_url: "/overview",
    display: "standalone",
    background_color: "#07070b",
    theme_color: "#07070b",
    icons: [
      { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/assets/icon-512-transparent.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
