import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-host target: emit a minimal server bundle (server.js + traced
  // node_modules) that the Dockerfile copies instead of the whole repo.
  output: "standalone",
};

export default nextConfig;
