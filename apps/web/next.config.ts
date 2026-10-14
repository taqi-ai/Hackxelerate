import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // the public student preview reads these read-only files at request time (see lib/demo-preview.ts)
  outputFileTracingIncludes: { "/**/*": ["./demo-data/preview/**/*"] },
  images: { formats: ["image/avif", "image/webp"] },
  experimental: {
    // keep visited dashboard tabs in the client router cache for 30 s: switching back is instant,
    // and every mutation calls revalidatePath, which clears it
    staleTimes: { dynamic: 30, static: 180 },
    // import only what is used from these big barrel packages: smaller client bundles
    optimizePackageImports: ["recharts", "lucide-react", "@tanstack/react-table", "radix-ui"],
  },
  // the Expo web build of the mobile app (public/mobile-sim) is a single-page app: every path serves its index
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/mobile-sim", destination: "/mobile-sim/index.html" },
        { source: "/mobile-sim/:path((?!_expo|assets|favicon.ico|index.html).*)", destination: "/mobile-sim/index.html" },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  // long-lived caching for the brand assets (content never changes under the same name)
  async headers() {
    return [
      { source: "/assets/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
