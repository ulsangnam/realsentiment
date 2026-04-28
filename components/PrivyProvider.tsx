"use client";

import { PrivyProvider as Privy } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

const solanaConnectors = toSolanaWalletConnectors({ shouldAutoConnect: false });

export default function PrivyProvider({ children }: { children: React.ReactNode }) {
  return (
    <Privy
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#6366f1",
          logo: "https://realsentiment.vercel.app/favicon.ico",
        },
        loginMethods: ["google", "email", "sms"],
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
        },
        externalWallets: { solana: { connectors: solanaConnectors } },
        defaultChain: {
          id: 103,
          name: "Solana Devnet",
          network: "solana-devnet",
          rpcUrls: { default: { http: ["https://api.devnet.solana.com"] } },
          nativeCurrency: { name: "SOL", symbol: "SOL", decimals: 9 },
          blockExplorers: {
            default: { name: "Solscan", url: "https://solscan.io" },
          },
        },
      }}
    >
      {children}
    </Privy>
  );
}
