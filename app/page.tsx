"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { Mail, Globe, MessageCircle, Shield, Zap, BarChart3, ArrowRight, CheckCircle } from "lucide-react";
import Navbar from "@/components/Navbar";

type Step = "landing" | "signup" | "done";

const features = [
  { icon: Shield, label: "1인 1표 보장", desc: "SBT 기반 신원 인증" },
  { icon: Zap, label: "즉시 보상", desc: "투표 즉시 토큰 지급" },
  { icon: BarChart3, label: "실시간 집계", desc: "조작 불가능한 온체인 집계" },
];

const socialButtons = [
  { icon: Mail, label: "이메일로 시작", color: "bg-white/10 hover:bg-white/20", textColor: "text-white" },
  { icon: Globe, label: "Google로 계속", color: "bg-blue-600 hover:bg-blue-700", textColor: "text-white" },
  { icon: MessageCircle, label: "카카오로 계속", color: "bg-yellow-400 hover:bg-yellow-500", textColor: "text-black" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("landing");
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  function handleLogin(label: string) {
    if (label === "Google로 계속") {
      setSelected(label);
      setLoading(true);
      signIn("google", { callbackUrl: "/vote" });
      return;
    }
    setSelected(label);
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("done");
    }, 1800);
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
        <AnimatePresence mode="wait">
          {step === "landing" && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-sm text-center"
            >
              {/* logo */}
              <motion.div
                className="float mx-auto mb-8 w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl pulse-glow"
              >
                <span className="text-4xl">🗳️</span>
              </motion.div>

              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                Real<span className="text-indigo-400">Sentiment</span>
              </h1>
              <p className="text-[var(--muted)] mb-10 text-sm leading-relaxed">
                블록체인으로 검증된 여론조사.<br />
                투표하고, 보상받고, 세상을 바꾸세요.
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
                  { val: "2.4M+", label: "참여자" },
                  { val: "98K+", label: "안건" },
                  { val: "₩0", label: "수수료" },
                ].map(({ val, label }) => (
                  <div key={label} className="text-center">
                    <p className="text-white font-bold text-lg">{val}</p>
                    <p className="text-[var(--muted)] text-xs">{label}</p>
                  </div>
                ))}
              </div>

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setStep("signup")}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-900/40"
              >
                시작하기 <ArrowRight size={18} />
              </motion.button>

              <p className="text-[var(--muted)] text-xs mt-4">
                지갑? 코인? 몰라도 됩니다 — 1초면 시작
              </p>
            </motion.div>
          )}

          {step === "signup" && (
            <motion.div
              key="signup"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="w-full max-w-sm"
            >
              <button
                onClick={() => setStep("landing")}
                className="text-[var(--muted)] text-sm mb-6 flex items-center gap-1 hover:text-white transition-colors"
              >
                ← 뒤로
              </button>

              <h2 className="text-2xl font-bold text-white mb-1">계정 만들기</h2>
              <p className="text-[var(--muted)] text-sm mb-8">
                소셜 계정으로 1초 만에 — 지갑이 자동 생성됩니다
              </p>

              <div className="space-y-3">
                {socialButtons.map(({ icon: Icon, label, color, textColor }) => (
                  <motion.button
                    key={label}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleLogin(label)}
                    disabled={loading}
                    className={`w-full py-4 rounded-2xl ${color} ${textColor} font-semibold flex items-center justify-center gap-3 transition-all border border-white/10 disabled:opacity-60`}
                  >
                    {loading && selected === label ? (
                      <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Icon size={20} />
                    )}
                    {loading && selected === label ? "지갑 생성 중..." : label}
                  </motion.button>
                ))}
              </div>

              <div className="mt-6 p-4 bg-indigo-950/50 border border-indigo-800/40 rounded-xl">
                <div className="flex items-start gap-2.5">
                  <Shield size={16} className="text-indigo-400 mt-0.5 shrink-0" />
                  <p className="text-indigo-200 text-xs leading-relaxed">
                    별도 앱 설치 없이 <strong>Face ID / 지문</strong>으로 서명합니다.
                    비밀키는 기기에만 저장됩니다.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="mx-auto mb-6 w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center"
              >
                <CheckCircle size={40} className="text-green-400" />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-2">지갑 생성 완료!</h2>
              <p className="text-[var(--muted)] text-sm mb-2">
                스마트 지갑이 자동 생성됐습니다
              </p>
              <p className="font-mono text-xs text-indigo-400 bg-indigo-950/50 rounded-lg px-3 py-2 mb-8 inline-block">
                0x71C...9Fe2
              </p>

              <div className="space-y-2 mb-8 text-left">
                {[
                  "KYC 인증 SBT 발급 완료",
                  "가입 보너스 50 VTX 지급",
                  "첫 투표 보상 대기 중",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-400" />
                    <span className="text-[var(--text)] text-sm">{item}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/vote"
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors"
              >
                지금 바로 투표하기 <ArrowRight size={18} />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Navbar />
    </div>
  );
}
