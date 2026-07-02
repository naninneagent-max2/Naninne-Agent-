import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@agent-os/core", "@agent-os/memory", "@agent-os/tools"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      { hostname: "avatars.githubusercontent.com" },
      { hostname: "*.supabase.co" },
    ],
  },
};

export default nextConfig;
