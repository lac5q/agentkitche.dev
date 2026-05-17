import type { NextConfig } from "next";
import path from "path";

const monorepoRoot = process.env.MEMROOS_ROOT || path.resolve(__dirname, "../..");

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['better-sqlite3'],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
