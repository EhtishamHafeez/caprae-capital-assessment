import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 ships a compiled native (.node) binary that the bundler
  // can't parse. Marking it external tells Next.js to require() it directly
  // at runtime instead of bundling it — required for Vercel's serverless
  // function tracer to pick up the binary correctly; without this the
  // deployed function fails at runtime with a "Cannot find module" /
  // bindings error even though local `next build` works fine.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
