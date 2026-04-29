"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { fetchVoterHistory, computePoliticalLeaning, type VoterHistory } from "@/lib/queries";

const SCORE_LABELS = ["매우반대", "반대", "중립", "찬성", "매우찬성"];
const SCORE_COLORS = ["#ef4444", "#f97316", "#94a3b8", "#34d399", "#10b981"];
const SCORE_EMOJI = ["😡", "🙁", "😐", "🙂", "😊"];

const LEANING_CONFIG: Record<string, { color: string; bg: string }> = {
  강보수: { color: "#ef4444", bg: "#ef444420" },
  보수:   { color: "#f97316", bg: "#f9731620" },
  중도:   { color: "#94a3b8", bg: "#94a3b820" },
  진보:   { color: "#34d399", bg: "#34d39920" },
  강진보: { color: "#10b981", bg: "#10b98120" },
};

function ScorePieBar({ history }: { history: VoterHistory[] }) {
  const counts = [0, 0, 0, 0, 0];
  history.forEach((h) => counts[h.score - 1]++);
  const total = counts.reduce((a, b) => a + b, 0) || 1;

  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-3 w-full mb-2">
        {counts.map((cnt, i) => (
          <motion.div
            key={i}
            initial={{ width: 0 }}
            animate={{ width: `${(cnt / total) * 100}%` }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
            style={{ background: SCORE_COLORS[i] }}
            className="h-full"
          />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1">
        {counts.map((cnt, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-base">{SCORE_EMOJI[i]}</span>
            <span className="text-[10px] font-bold" style={{ color: SCORE_COLORS[i] }}>{cnt}</span>
            <span className="text-[9px] text-[var(--muted)] text-center leading-tight">{SCORE_LABELS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaningMeter({ score, label }: { score: number; label: string }) {
  const cfg = LEANING_CONFIG[label] ?? LEANING_CONFIG["중도"];
  const pct = ((score + 100) / 200) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-[var(--muted)] mb-1.5">
        <span>강진보</span>
        <span>중도</span>
        <span>강보수</span>
      </div>
      <div className="relative h-3 bg-[var(--card-border)] rounded-full overflow-visible">
        <div className="absolute left-1/2 top-0 w-px h-full bg-slate-500 opacity-60" />
        <motion.div
          className="absolute top-0 h-full w-4 rounded-full shadow-lg"
          animate={{ left: `calc(${pct}% - 8px)` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ background: cfg.color }}
        />
      </div>
      <div className="flex justify-center mt-3">
        <span
          className="text-sm font-bold px-4 py-1.5 rounded-full border"
          style={{ color: cfg.color, borderColor: cfg.color + "60", background: cfg.bg }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export default function NodePage({ params }: { params: { wallet: string } }) {
  const router = useRouter();
  const wallet = params.wallet;
  const [history, setHistory] = useState<VoterHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchVoterHistory(wallet).then(setHistory).finally(() => setLoading(false));
  }, [wallet]);

  const { label: leaningLabel, score: leaningScore } = computePoliticalLeaning(history);
  const avgScore = history.length > 0
    ? (history.reduce((s, h) => s + h.score, 0) / history.length).toFixed(2)
    : "–";

  function copyAddress() {
    navigator.clipboard.writeText(wallet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* top bar */}
      <div className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--card-border)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-[var(--muted)] hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-white font-bold text-base">노드 프로파일</h1>
            <p className="text-[var(--muted)] text-xs font-mono">{wallet.slice(0, 6)}…{wallet.slice(-6)}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={copyAddress} className="text-[var(--muted)] hover:text-white transition-colors">
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
            </button>
            <a
              href={`https://solscan.io/account/${wallet}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* leaning card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4"
            >
              <p className="text-[var(--muted)] text-xs mb-4">정치 성향 (온체인 투표 기반)</p>
              {history.length > 0 ? (
                <LeaningMeter score={leaningScore} label={leaningLabel} />
              ) : (
                <p className="text-[var(--muted)] text-sm text-center py-4">투표 기록 없음</p>
              )}
            </motion.div>

            {/* stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="grid grid-cols-2 gap-3"
            >
              <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4">
                <p className="text-[var(--muted)] text-xs">총 투표 수</p>
                <p className="text-white font-bold text-3xl mt-1">{history.length}</p>
                <p className="text-[var(--muted)] text-[10px] mt-1">블록 기록</p>
              </div>
              <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4">
                <p className="text-[var(--muted)] text-xs">평균 점수</p>
                <p className="text-white font-bold text-3xl mt-1">{avgScore}</p>
                <p className="text-[var(--muted)] text-[10px] mt-1">1.0 ~ 5.0</p>
              </div>
            </motion.div>

            {/* score distribution */}
            {history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4"
              >
                <p className="text-[var(--muted)] text-xs mb-3">점수 분포</p>
                <ScorePieBar history={history} />
              </motion.div>
            )}

            {/* vote history */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4"
            >
              <p className="text-[var(--muted)] text-xs mb-2">
                투표 기록 ({history.length}건) — 온체인 검증됨
              </p>
              {history.length === 0 ? (
                <p className="text-[var(--muted)] text-sm text-center py-8">아직 투표 기록이 없어요</p>
              ) : (
                history.map((r) => {
                  const score = r.score;
                  const label = SCORE_LABELS[score - 1];
                  const color = SCORE_COLORS[score - 1];
                  const date = new Date(r.votedAt * 1000);
                  const dateStr = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;

                  return (
                    <div
                      key={`${r.issueId}-${r.votedAt}`}
                      className="flex items-start gap-3 py-3 border-b border-[var(--card-border)] last:border-0"
                    >
                      <span className="text-xl mt-0.5">{SCORE_EMOJI[score - 1]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium leading-snug">
                          {r.issueTitle ?? r.issueId}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {r.issueCategory && (
                            <span className="text-[10px] bg-indigo-900/40 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-800/40">
                              {r.issueCategory}
                            </span>
                          )}
                          <span className="text-[10px] text-[var(--muted)]">{dateStr}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{ color, borderColor: color + "50", background: color + "15" }}
                        >
                          {label}
                        </span>
                        <a
                          href={`https://solscan.io/account/${wallet}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--muted)] hover:text-indigo-400 transition-colors"
                        >
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
