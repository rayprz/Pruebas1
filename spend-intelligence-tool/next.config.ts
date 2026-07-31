import type { NextConfig } from "next";

// NOTE: unlike the sibling fleet-decision-tool (a static `output: "export"`
// site), this app ships a server route (`/api/classify`) that calls the Claude
// API for the AI half of the hybrid classifier. Server routes are incompatible
// with static export, so this app runs on a Node host (`next start`, Vercel,
// etc.) and keeps the ANTHROPIC_API_KEY server-side.
const nextConfig: NextConfig = {};

export default nextConfig;
