"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, ChevronRight } from "lucide-react";
import Link from "next/link";
import { fetchVoterHistory, computePoliticalLeaning, type VoterHistory } from "@/lib/queries";

const SCORE_LABELS = ["매우반대", "반대", "중립", "찬성", "매우찬성"];
const SCORE_COLORS = ["#ef4444", "#f97316", "#94a3b8", "#34d399", "#10b981"];
const SCORE_EMOJI = ["😡", "🙁", "😐", "🙂", "😊"];

const LEANING_CONFIG: Record<string, { color: string; bg: string; bar: number }> = {
  강보수:  { color: "#ef4444", bg: "#ef444420", bar: 95 },
  보수:    { color: "#f97316", bg: "#f9731620", bar: 70 },
  중도:    { color: "#94a3b8", bg: "#94a3b820", bar: 50 },
  진보:    { color: "#34d399", bg: "#34d39920", bar: 30 },
  강진보:  { color: "#10b981", bg: "#10b98120", bar: 5  },
};

function shortAddr(addr: string) {
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

function LeaningMeter({ score, label }: { score: number; label: string }) {
  const cfg = LEANING_CONFIG[label] ?? LEANING_CONFIG["중도"];
  // score: -100 (강진보) ~ +100 (강보수), center at 0
  const pct = ((score + 100) / 200) * 100; // 0–100%

  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1">
        <span>진보</span>
        <span>중도</span>
        <span>보수</span>
      </div>
      <div className="relative h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
        {/* center line */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-slate-500 opacity-50" />
        <motion.div
          className="absolute top-0 h-full w-3 rounded-full"
          animate={{ left: `calc(${pct}% - 6px)` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ background: cfg.color }}
        />
      </div>
      <div className="flex justify-center mt-2">
        <span
          className="text-xs font-bold px-3 py-1 rounded-full border"
          style={{ color: cfg.color, borderColor: cfg.color + "50", background: cfg.bg }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function VoteHistoryItem({ record }: { record: VoterHistory }) {
  const score = record.score;
  const label = SCORE_LABELS[score - 1];
  const color = SCORE_COLORS[score - 1];
  const emoji = SCORE_EMOJI[score - 1];

  const date = new Date(record.votedAt * 1000);
  const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--card-border)] last:border-0">
      <span className="text-lg mt-0.5">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium leading-snug truncate">
          {record.issueTitle ?? record.issueId}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {record.issueCategory && (
            <span className="text-[10px] text-indigo-400">{record.issueCategory}</span>
          )}
          <span className="text-[10px] text-[var(--muted)]">{dateStr}</span>
        </div>
      </div>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0"
        style={{ color, borderColor: color + "50", background: color + "15" }}
      >
        {label}
      </span>
    </div>
  );
}

export default function NodeProfileModal({
  walletAddress,
  onClose,
}: {
  walletAddress: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<VoterHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchVoterHistory(walletAddress)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [walletAddress]);

  const { label: leaningLabel, score: leaningScore } = computePoliticalLeaning(history);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative w-full max-w-lg bg-[var(--background)] border border-[var(--card-border)] rounded-t-3xl overflow-hidden"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 300 }}
          style={{ maxHeight: "85vh" }}
        >
          {/* handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-600 rounded-full" />
          </div>

          {/* header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--card-border)]">
            <div>
              <h2 className="text-white font-bold text-base">노드 프로파일</h2>
              <p className="text-[var(--muted)] text-xs font-mono">{shortAddr(walletAddress)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/node/${walletAddress}`}
                className="text-indigo-400 text-xs flex items-center gap-1 hover:text-indigo-300 transition-colors"
              >
                풀페이지 <ChevronRight size={12} />
              </Link>
              <button onClick={onClose} className="text-[var(--muted)] hover:text-white transition-colors p-1">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: "calc(85vh - 100px)" }}>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* political leaning */}
                <div className="px-4 py-4 border-b border-[var(--card-border)]">
                  <p className="text-[var(--muted)] text-xs mb-3">정치 성향 (온체인 투표 기반)</p>
                  {history.length > 0 ? (
                    <LeaningMeter score={leaningScore} label={leaningLabel} />
                  ) : (
                    <p className="text-[var(--muted)] text-xs text-center py-2">투표 기록 없음</p>
                  )}
                </div>

                {/* stats */}
                <div className="px-4 py-3 border-b border-[var(--card-border)] grid grid-cols-2 gap-3">
                  <div className="bg-[var(--card)] rounded-xl p-3">
                    <p className="text-[var(--muted)] text-[10px]">총 투표</p>
                    <p className="text-white font-bold text-xl">{history.length}</p>
                  </div>
                  <div className="bg-[var(--card)] rounded-xl p-3">
                    <p className="text-[var(--muted)] text-[10px]">평균 점수</p>
                    <p className="text-white font-bold text-xl">
                      {history.length > 0
                        ? (history.reduce((s, h) => s + h.score, 0) / history.length).toFixed(1)
                        : "–"}
                    </p>
                  </div>
                </div>

                {/* vote history */}
                <div className="px-4 py-3">
                  <p className="text-[var(--muted)] text-xs mb-2">투표 기록 (온체인)</p>
                  {history.length === 0 ? (
                    <p className="text-[var(--muted)] text-sm text-center py-8">아직 투표 기록이 없어요</p>
                  ) : (
                    history.map((r) => (
                      <VoteHistoryItem key={`${r.issueId}-${r.votedAt}`} record={r} />
                    ))
                  )}
                </div>

                {/* solscan link */}
                <div className="px-4 pb-6">
                  <a
                    href={`https://solscan.io/account/${walletAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs transition-colors py-2"
                  >
                    <ExternalLink size={12} />
                    Solscan에서 직접 확인
                  </a>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
