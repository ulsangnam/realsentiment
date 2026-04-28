import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // Deduplicate @solana/web3.js to prevent two copies of PublicKey class
      // which causes "Cannot read properties of undefined (reading '_bn')" in browser
      "@solana/web3.js": "@solana/web3.js",
    },
  },
};

export default nextConfig;
