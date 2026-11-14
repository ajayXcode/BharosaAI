import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ["tesseract.js", "@napi-rs/canvas"],
};

export default nextConfig;
