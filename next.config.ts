import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  runtime: "nodejs",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "ucarecdn.com",
      },
    ],
  },
};

export default nextConfig;
