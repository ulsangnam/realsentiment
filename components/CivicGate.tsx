"use client";

import { useGateway, GatewayProvider, GatewayStatus } from "@civic/solana-gateway-react";
import { useWallets } from "@privy-io/react-auth/solana";
import { Connection, PublicKey } from "@solana/web3.js";
import { motion } from "framer-motion";
import { Shield, Loader2 } from "lucide-react";

const CIVIC_GATEKEEPER_NETWORK = new PublicKey(
  "uniqobk8oGh4XBLMqM68K8M2zNu3CdYX7q5go7whQiv"
);
const DEVNET_CONNECTION = new Connection("https://api.devnet.solana.com");

function CivicGateInner({ children }: { children: React.ReactNode }) {
  const { requestGatewayToken, gatewayStatus, gatewayToken } = useGateway();

  if (gatewayToken) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
        <Shield size={32} className="text-white" />
      </div>
      <h2 className="text-white font-bold text-xl mb-2">신원 인증 필요</h2>
      <p className="text-[var(--muted)] text-sm mb-6 max-w-xs leading-relaxed">
        1인 1표 보장을 위해 Civic Pass 인증이 필요합니다.<br />
        신분증 또는 얼굴 인식으로 1분 이내에 완료됩니다.
      </p>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={requestGatewayToken}
        className="w-full max-w-xs py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors"
      >
        {gatewayStatus === GatewayStatus.IN_REVIEW ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            인증 중...
          </>
        ) : (
          <>
            <Shield size={18} />
            Civic Pass로 인증하기
          </>
        )}
      </motion.button>

      <p className="text-[var(--muted)] text-xs mt-4">
        한국 PASS 연동은 2025 Q3 예정
      </p>
    </motion.div>
  );
}

export default function CivicGate({ children }: { children: React.ReactNode }) {
  const { wallets } = useWallets();
  const wallet = wallets[0];

  const walletAdapter = wallet
    ? { publicKey: new PublicKey(wallet.address) }
    : undefined;

  return (
    <GatewayProvider
      wallet={walletAdapter}
      gatekeeperNetwork={CIVIC_GATEKEEPER_NETWORK}
      connection={DEVNET_CONNECTION}
      cluster="devnet"
      options={{ autoShowModal: false }}
    >
      <CivicGateInner>{children}</CivicGateInner>
    </GatewayProvider>
  );
}
