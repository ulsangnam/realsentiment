"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Shield, Zap, BarChart3, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";

const features = [
  { icon: Shield, label: "1-Person-1-Vote", desc: "Civic Pass identity verified" },
  { icon: Zap, label: "Instant Rewards", desc: "VTX tokens on every vote" },
  { icon: BarChart3, label: "On-Chain Results", desc: "Verified on Solana" },
];

export default function OnboardingPage() {
  const { login, authenticated, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/vote");
    }
  }, [ready, authenticated, router]);

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm text-center"
        >
          {/* logo */}
          <motion.div className="float mx-auto mb-8 w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl pulse-glow">
            <span className="text-4xl">🗳️</span>
          </motion.div>

          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            Real<span className="text-indigo-400">Sentiment</span>
          </h1>
          <p className="text-[var(--muted)] mb-10 text-sm leading-relaxed">
            Blockchain-verified public opinion.<br />
            Vote, earn rewards, shape the world.
          </p>

          {/* features */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {features.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-3 text-center">
                <Icon size={20} className="text-indigo-400 mx-auto mb-1.5" />
                <p className="text-white text-xs font-semibold leading-tight">{label}</p>
                <p className="text-[var(--muted)] text-[10px] mt-0.5 leading-tight">{desc}</p>
              </div>
            ))}
          </div>

          {/* stats */}
          <div className="flex justify-around mb-10 bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4">
            {[
              { val: "2.4M+", label: "Participants" },
              { val: "98K+", label: "Issues" },
              { val: "$0", label: "Gas Fee" },
            ].map(({ val, label }) => (
              <div key={label} className="text-center">
                <p className="text-white font-bold text-lg">{val}</p>
                <p className="text-[var(--muted)] text-xs">{label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          {!ready ? (
            <div className="w-full py-4 bg-indigo-600/50 rounded-2xl flex items-center justify-center">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={login}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-900/40"
            >
              Get Started <ArrowRight size={18} />
            </motion.button>
          )}

          <p className="text-[var(--muted)] text-xs mt-4">
            No wallet needed — sign in with Google, email, or SMS
          </p>

          {/* KYC flow explanation */}
          <div className="mt-6 p-4 bg-indigo-950/50 border border-indigo-800/40 rounded-xl text-left">
            <p className="text-indigo-300 text-xs font-semibold mb-2">How it works</p>
            {[
              "Sign in with Google / email / SMS",
              "Wallet auto-created — no seed phrase",
              "Civic Pass KYC → 1-person-1-vote confirmed",
              "Vote and earn VTX on Solana",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2 mb-1.5">
                <span className="text-indigo-400 text-xs font-bold mt-0.5">{i + 1}.</span>
                <span className="text-indigo-200 text-xs">{step}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      <Navbar />
    </div>
  );
}
