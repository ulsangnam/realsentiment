"use client";

import { PrivyProvider as Privy } from "@privy-io/react-auth";

export default function PrivyProvider({ children }: { children: React.ReactNode }) {
  return (
    <Privy
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmohyjthv00h40cl202regp7o"}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#6366f1",
        },
        loginMethods: ["google", "email", "sms"],
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
        },
      }}
    >
      {children}
    </Privy>
  );
}
