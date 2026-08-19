import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Used for seed/demo placeholder imagery only — replace with your
      // real image host (S3/CDN) in production and remove this pattern.
      { protocol: "https", hostname: "picsum.photos" },
    ],
  },
};

export default nextConfig;
