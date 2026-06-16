import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `output: "standalone"` only when building the Docker image (small,
  // self-contained server.js). Managed hosts like Vercel use their own build
  // pipeline, so we leave the default output there.
  ...(process.env.DOCKER_BUILD === "true" ? { output: "standalone" as const } : {}),
  // We don't use next/image optimization (no sharp/runtime image service).
  images: { unoptimized: true },
};

export default nextConfig;
