import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["100.109.24.11"],
  serverExternalPackages: ["better-sqlite3", "sharp"],
};

export default nextConfig;
