import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // TypeScript 7 (native) has no JS compiler API; use local `tsc` instead.
    useTypeScriptCli: true,
  },
  transpilePackages: [
    "@npmax/ui",
    "@npmax/core",
    "@npmax/types",
    "@npmax/api-client",
    "@npmax/app-shell",
  ],
};

export default nextConfig;
