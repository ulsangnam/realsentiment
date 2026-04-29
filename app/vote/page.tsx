"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, Users, Coins, Shield, ExternalLink } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignTransaction, useCreateWallet } from "@privy-io/react-auth/solana";
import Navbar from "@/components/Navbar";
import { MOCK_ISSUES, type Issue } from "@/lib/mockData";
import { buildVoteTransaction } from "@/lib/solana";

const SCORE_LABELS = ["매우반대", "반대", "중립", "찬성", "매우찬성"];
const SCORE_LABELS_EN = ["Strongly\nOppose", "Oppose", "Neutral", "Support", "Strongly\nSupport"];
const SCORE_COLORS = ["#ef4444", "#f97316", "#94a3b8", "#34d399", "#10b981"];

type VoteState = Record<string, number | null>; // 1–5

function ScoreDistributionBar({ scores }: { scores: number[] }) {
  const total = scores.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="flex rounded-full overflow-hidden h-2 w-full">
      {scores.map((count, i) => {
        const pct = (count / total) * 100;
        return (
          <motion.div
            key={i}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{ background: SCORE_COLORS[i] }}
            className="h-full"
          />
        );
      })}
    </div>
  );
}

function VoteCard({
  issue,
  onVote,
  voted,
  onChainVote,
}: {
  issue: Issue;
  onVote: (id: string, score: number) => void;
  voted: number | null;
  onChainVote: (issueId: string, score: number) => Promise<string | null>;
}) {
  const [showChart, setShowChart] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [onChainLoading, setOnChainLoading] = useState(false);
  const [onChainError, setOnChainError] = useState<string | null>(null);

  // Simulated score distribution (before real on-chain data)
  const mockScores = [
    Math.round(issue.noVotes * 0.4),
    Math.round(issue.noVotes * 0.6),
    Math.round((issue.yesVotes + issue.noVotes) * 0.05),
    Math.round(issue.yesVotes * 0.4),
    Math.round(issue.yesVotes * 0.6),
  ];

  const scoreLabels = issue.lang === "en" ? SCORE_LABELS_EN : SCORE_LABELS;

  async function handleVote(score: number) {
    if (voted !== null) return;
    onVote(issue.id, score);
    setOnChainLoading(true);
    setOnChainError(null);
    try {
      const sig = await onChainVote(issue.id, score);
      if (sig) setTxSig(sig);
      else setOnChainError("no wallet / not signed");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOnChainError(msg);
    } finally {
      setOnChainLoading(false);
    }
  }

  const votedLabel = voted !== null ? scoreLabels[voted - 1] : null;
  const votedColor = voted !== null ? SCORE_COLORS[voted - 1] : "#94a3b8";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl overflow-hidden"
    >
      {/* header */}
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium bg-indigo-900/50 text-indigo-300 px-2.5 py-1 rounded-full border border-indigo-800/50">
            {issue.flag} {issue.category}
          </span>
          <div className="flex items-center gap-1 text-[var(--muted)] text-xs">
            <Clock size={12} />
            {issue.expiresIn} {issue.lang === "en" ? "left" : "남음"}
          </div>
        </div>
        <h3 className="text-white font-bold text-base leading-snug mb-1">{issue.title}</h3>
        <p className="text-[var(--muted)] text-xs leading-relaxed line-clamp-2">{issue.summary}</p>
      </div>

      {/* score distribution bar */}
      <div className="px-4 mb-3">
        <ScoreDistributionBar scores={mockScores} />
        <div className="flex justify-between mt-1.5">
          <span className="text-red-400 text-[10px] font-bold">{issue.lang === "en" ? "Oppose" : "반대측"}</span>
          <span className="text-[var(--muted)] text-[10px]">{issue.lang === "en" ? "Neutral" : "중립"}</span>
          <span className="text-emerald-400 text-[10px] font-bold">{issue.lang === "en" ? "Support" : "찬성측"}</span>
        </div>
      </div>

      {/* chart toggle */}
      <div className="px-4 mb-3">
        <button
          onClick={() => setShowChart(!showChart)}
          className="flex items-center gap-1 text-[var(--muted)] hover:text-indigo-400 text-xs transition-colors"
        >
          {issue.lang === "en" ? "Live trend" : "실시간 추이"} {showChart ? "▲" : "▼"}
        </button>
        <AnimatePresence>
          {showChart && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 120, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-2"
            >
              <ResponsiveContainer width="100%" height={110}>
                <AreaChart data={issue.trend}>
                  <defs>
                    <linearGradient id={`yes-${issue.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id={`no-${issue.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip
                    contentStyle={{ background: "#0f0f1a", border: "1px solid #1e1e35", borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={(v) => [`${v}%`]}
                  />
                  <Area type="monotone" dataKey="yes" stroke="#10b981" strokeWidth={2} fill={`url(#yes-${issue.id})`} name={issue.lang === "en" ? "Support" : "찬성"} />
                  <Area type="monotone" dataKey="no" stroke="#f43f5e" strokeWidth={2} fill={`url(#no-${issue.id})`} name={issue.lang === "en" ? "Oppose" : "반대"} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* meta */}
      <div className="px-4 pb-3 flex items-center gap-3 text-[var(--muted)] text-xs">
        <div className="flex items-center gap-1">
          <Users size={12} />
          {(issue.totalVoters / 1000).toFixed(0)}K {issue.lang === "en" ? "voted" : "참여"}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {issue.tags.map((tag) => (
            <span key={tag} className="text-indigo-400 text-[10px]">#{tag}</span>
          ))}
        </div>
      </div>

      {/* vote section */}
      <div className="p-3 border-t border-[var(--card-border)]">
        {voted !== null ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-bold px-3 py-1 rounded-full border"
                style={{ color: votedColor, borderColor: votedColor + "50", background: votedColor + "15" }}
              >
                {votedLabel}
              </span>
              <div className="flex items-center gap-1">
                <Coins size={14} className="text-yellow-400" />
                <span className="text-yellow-400 font-semibold text-sm">+10 VTX</span>
              </div>
            </div>
            {onChainLoading && (
              <p className="text-indigo-400 text-xs flex items-center gap-1">
                <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                {issue.lang === "en" ? "Recording on Solana..." : "솔라나 기록 중..."}
              </p>
            )}
            {txSig && (
              <a
                href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
              >
                <ExternalLink size={11} />
                View on Solscan
              </a>
            )}
            {onChainError && !txSig && (
              <p className="text-rose-400 text-[10px] max-w-[240px] break-all">⚠ {onChainError}</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((score) => (
              <motion.button
                key={score}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleVote(score)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-[10px] font-bold leading-tight"
                style={{
                  color: SCORE_COLORS[score - 1],
                  borderColor: SCORE_COLORS[score - 1] + "50",
                  background: SCORE_COLORS[score - 1] + "12",
                }}
              >
                <span className="text-base">{["😡", "🙁", "😐", "🙂", "😊"][score - 1]}</span>
                <span className="text-center">{(issue.lang === "en" ? SCORE_LABELS_EN : SCORE_LABELS)[score - 1]}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function VotePage() {
  const [votes, setVotes] = useState<VoteState>({});
  const [totalEarned, setTotalEarned] = useState(50);
  const [lang, setLang] = useState<"en" | "ko">("en");
  const [filter, setFilter] = useState("All");
  const { authenticated, login } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signTransaction } = useSignTransaction();
  const { createWallet } = useCreateWallet();

  const privyWallet = wallets.find(
    (w) => ("walletClientType" in w && (w as Record<string, unknown>).walletClientType === "privy") ||
           ("name" in w && String((w as Record<string, unknown>).name).toLowerCase().includes("privy"))
  ) ?? null;
  const solanaWallet = privyWallet ?? wallets[0] ?? null;

  useEffect(() => {
    if (authenticated && walletsReady && wallets.length === 0) {
      createWallet().catch(() => {});
    }
  }, [authenticated, walletsReady, wallets.length]);

  async function onChainVote(issueId: string, score: number): Promise<string | null> {
    const wallet = privyWallet ?? wallets[0] ?? null;
    if (!wallet) throw new Error(`no wallet (ready=${walletsReady}, count=${wallets.length})`);
    const feePayerAddress = process.env.NEXT_PUBLIC_FEE_PAYER;
    const tx = await buildVoteTransaction(wallet.address, issueId, score, feePayerAddress);
    const serialized = new Uint8Array(tx.serialize());
    const { signedTransaction } = await signTransaction({
      transaction: serialized,
      wallet,
      chain: "solana:devnet",
    });
    const signedTxBase64 = Buffer.from(signedTransaction).toString("base64");
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedTxBase64 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "vote API failed");
    return data.signature as string;
  }

  const categoriesEn = ["All", "Tech & AI", "Labor & Economy", "Finance & Tax", "Energy & Climate"];
  const categoriesKo = ["전체", "기술·AI", "노동·경제", "금융·세금", "에너지·환경"];
  const categories = lang === "en" ? categoriesEn : categoriesKo;

  const byLang = MOCK_ISSUES.filter((i) => i.lang === lang);
  const filtered = filter === "All" || filter === "전체"
    ? byLang
    : byLang.filter((i) => i.category === filter);

  function handleVote(id: string, score: number) {
    setVotes((prev) => ({ ...prev, [id]: score }));
    setTotalEarned((prev) => prev + 10);
  }

  function switchLang(l: "en" | "ko") {
    setLang(l);
    setFilter(l === "en" ? "All" : "전체");
    localStorage.setItem("rs_lang", l);
    window.dispatchEvent(new StorageEvent("storage", { key: "rs_lang", newValue: l }));
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--card-border)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">🗳️ {lang === "en" ? "Today's Issues" : "오늘의 안건"}</h1>
            <p className="text-[var(--muted)] text-xs">{byLang.length} {lang === "en" ? "live now" : "개 진행 중"}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-[var(--card)] border border-[var(--card-border)] rounded-xl overflow-hidden">
              <button
                onClick={() => switchLang("en")}
                className={`px-3 py-1.5 text-xs font-bold transition-all ${lang === "en" ? "bg-indigo-600 text-white" : "text-[var(--muted)]"}`}
              >
                🇺🇸 EN
              </button>
              <button
                onClick={() => switchLang("ko")}
                className={`px-3 py-1.5 text-xs font-bold transition-all ${lang === "ko" ? "bg-indigo-600 text-white" : "text-[var(--muted)]"}`}
              >
                🇰🇷 KR
              </button>
            </div>
            <div className="flex items-center gap-1.5 bg-yellow-500/15 border border-yellow-500/30 rounded-xl px-3 py-1.5">
              <Coins size={14} className="text-yellow-400" />
              <span className="text-yellow-400 font-bold text-sm">{totalEarned} VTX</span>
            </div>
          </div>
        </div>
        <div className="px-4 pb-3 flex items-center justify-between">
          {authenticated ? (
            <p className="text-emerald-400 text-xs flex items-center gap-1">
              <Shield size={12} />
              Civic verified — votes recorded on Solana
            </p>
          ) : (
            <button onClick={login} className="text-indigo-400 text-xs flex items-center gap-1 hover:text-indigo-300 transition-colors">
              <Shield size={12} />
              Sign in to record votes on-chain
            </button>
          )}
        </div>
        <div className="overflow-x-auto pb-3 px-4">
          <div className="flex gap-2 w-max">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  filter === cat
                    ? "bg-indigo-600 text-white"
                    : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)] hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-4">
        <AnimatePresence>
          {filtered.map((issue) => (
            <VoteCard
              key={issue.id}
              issue={issue}
              onVote={handleVote}
              voted={votes[issue.id] ?? null}
              onChainVote={onChainVote}
            />
          ))}
        </AnimatePresence>
      </div>

      <Navbar />
    </div>
  );
}
