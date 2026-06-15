import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone server build → small, self-contained Docker image (.next/standalone
  // ships a minimal server.js with only the files the app needs).
  output: "standalone",
  // We don't use next/image optimization; keep it disabled so no sharp/runtime
  // image service is required inside the container.
  images: { unoptimized: true },
};

export default nextConfig;
