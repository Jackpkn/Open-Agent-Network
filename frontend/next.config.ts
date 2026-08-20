import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by frontend/Dockerfile, which copies .next/standalone.
  output: 'standalone',
  // Without this, Next traces up past the repo and nests the standalone build
  // under the inferred workspace path, so .next/standalone/server.js does not
  // exist and the Docker COPY fails. Pin the root to this project.
  outputFileTracingRoot: process.cwd(),
  turbopack: {},
  serverExternalPackages: [
    '@walletconnect/ethereum-provider',
    '@base-org/account',
    '@coinbase/cdp-sdk',
    '@solana/web3.js',
    '@solana/rpc',
  ],
};

export default nextConfig;
