import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Everything here is per-request / realtime, so we use the classic dynamic model.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  devIndicators: { position: "top-right" },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "static-cdn.jtvnw.net" }],
  },
};

export default nextConfig;
