import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
