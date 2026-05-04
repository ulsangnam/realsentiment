"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Shield, Search, FileText } from "lucide-react";

const SCORE_ROWS = [
  { score: 1, emoji: "😡", en: "Strongly Oppose", ko: "매우반대", color: "#ef4444" },
  { score: 2, emoji: "🙁", en: "Oppose",          ko: "반대",   color: "#f97316" },
  { score: 3, emoji: "😐", en: "Neutral",         ko: "중립",   color: "#94a3b8" },
  { score: 4, emoji: "🙂", en: "Support",         ko: "찬성",   color: "#34d399" },
  { score: 5, emoji: "😊", en: "Strongly Support",ko: "매우찬성",color: "#10b981" },
];

export default function VerifyGuideModal({
  open,
  onClose,
  lang = "en",
}: {
  open: boolean;
  onClose: () => void;
  lang?: "en" | "ko";
}) {
  const isEN = lang === "en";

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-50"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--card)] border-t border-[var(--card-border)] rounded-t-2xl max-h-[85vh] overflow-y-auto"
          >
            {/* handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[var(--card-border)]" />
            </div>

            <div className="px-5 pb-10 space-y-5">
              {/* title */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={18} className="text-indigo-400" />
                  <h2 className="text-white font-bold text-base">
                    {isEN ? "How to verify your vote" : "내 투표 검증하는 법"}
                  </h2>
                </div>
                <button onClick={onClose} className="text-[var(--muted)] hover:text-white">
                  <X size={18} />
                </button>
              </div>

              {/* score table */}
              <div className="bg-[var(--background)] rounded-xl p-3 space-y-1">
                <p className="text-[var(--muted)] text-xs mb-2 flex items-center gap-1">
                  <FileText size={11} />
                  {isEN ? "Score recorded on-chain" : "온체인에 기록되는 점수"}
                </p>
                {SCORE_ROWS.map((r) => (
                  <div key={r.score} className="flex items-center gap-3 py-1.5 border-b border-[var(--card-border)] last:border-0">
                    <span className="text-[var(--muted)] text-xs font-mono w-4">{r.score}</span>
                    <span className="text-base">{r.emoji}</span>
                    <div className="flex-1">
                      <span className="text-xs font-bold" style={{ color: r.color }}>
                        {isEN ? r.en : r.ko}
                      </span>
                    </div>
                    <span className="text-[var(--muted)] text-[10px] font-mono">score={r.score}</span>
                  </div>
                ))}
              </div>

              {/* memo explanation */}
              <div className="bg-[var(--background)] rounded-xl p-3 space-y-2">
                <p className="text-[var(--muted)] text-xs flex items-center gap-1">
                  <Search size={11} />
                  {isEN ? "What you'll see on Solscan" : "Solscan에서 보이는 내용"}
                </p>
                <div className="bg-black/40 rounded-lg px-3 py-2 font-mono text-[10px] text-emerald-400 break-all">
                  RealSentiment|issue:e1|score:4/5|Support
                </div>
                <p className="text-[var(--muted)] text-[10px] leading-relaxed">
                  {isEN
                    ? "Every vote includes a human-readable Memo on-chain. Anyone can verify issue ID, score, and label — no trust required."
                    : "모든 투표에 사람이 읽을 수 있는 Memo가 온체인에 포함됩니다. 누구나 안건 ID, 점수, 라벨을 검증할 수 있어요."}
                </p>
              </div>

              {/* how to check */}
              <div className="space-y-2">
                <p className="text-white text-xs font-bold">
                  {isEN ? "Steps to verify" : "검증 방법"}
                </p>
                {[
                  isEN
                    ? ["1", 'Click "View on Solscan" after voting']
                    : ["1", '투표 후 "View on Solscan" 클릭'],
                  isEN
                    ? ["2", "Find the Memo field in Transaction Details"]
                    : ["2", "Transaction Details에서 Memo 필드 확인"],
                  isEN
                    ? ["3", "Match issue ID and score to your vote"]
                    : ["3", "안건 ID와 점수가 내 투표와 일치하는지 확인"],
                ].map(([num, text]) => (
                  <div key={num} className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{num}</span>
                    <p className="text-[var(--muted)] text-xs leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>

              {/* solscan link */}
              <a
                href="https://solscan.io/account/24DscDehhLv8WamjRUc3Zj3B9hSt8wPeiiLCFX7r1XWy?cluster=devnet"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-indigo-700/50 text-indigo-400 text-xs font-medium"
              >
                <ExternalLink size={13} />
                {isEN ? "View all votes on Solscan" : "Solscan에서 전체 투표 보기"}
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
