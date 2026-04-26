import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@inhouse/core"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
