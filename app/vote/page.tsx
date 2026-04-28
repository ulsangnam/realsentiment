"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { ThumbsUp, ThumbsDown, Clock, Users, Coins, ExternalLink, Shield } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import Navbar from "@/components/Navbar";
import { MOCK_ISSUES, type Issue } from "@/lib/mockData";
import { castVoteOnChain } from "@/lib/solana";
import { PublicKey } from "@solana/web3.js";


type VoteState = Record<string, "yes" | "no" | null>;

function VoteCard({
  issue,
  onVote,
  voted,
  anchorWallet,
}: {
  issue: Issue;
  onVote: (id: string, choice: "yes" | "no") => void;
  voted: "yes" | "no" | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anchorWallet: any;
}) {
  const [showChart, setShowChart] = useState(false);
  const [animBalance, setAnimBalance] = useState({ yes: issue.yesVotes, no: issue.noVotes });
  const [txSig, setTxSig] = useState<string | null>(null);
  const [onChainLoading, setOnChainLoading] = useState(false);

  const yesPercent = Math.round((animBalance.yes / (animBalance.yes + animBalance.no)) * 100);
  const noPercent = 100 - yesPercent;

  async function handleVote(choice: "yes" | "no") {
    if (voted) return;
    setAnimBalance((prev) => ({
      yes: choice === "yes" ? prev.yes + 1 : prev.yes,
      no: choice === "no" ? prev.no + 1 : prev.no,
    }));
    onVote(issue.id, choice);

    // on-chain recording if wallet connected
    if (anchorWallet) {
      setOnChainLoading(true);
      try {
        const sig = await castVoteOnChain(anchorWallet, issue.id, choice === "yes");
        setTxSig(sig);
      } catch (e) {
        // vote already cast or other error — ignore for UX
        console.warn("on-chain vote:", e);
      } finally {
        setOnChainLoading(false);
      }
    }
  }

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

        <h3 className="text-white font-bold text-base leading-snug mb-1">
          {issue.title}
        </h3>
        <p className="text-[var(--muted)] text-xs leading-relaxed line-clamp-2">
          {issue.summary}
        </p>
      </div>

      {/* live bar */}
      <div className="px-4 mb-3">
        <div className="flex rounded-full overflow-hidden h-2">
          <motion.div
            animate={{ width: `${yesPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-emerald-500 h-full"
          />
          <motion.div
            animate={{ width: `${noPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-rose-500 h-full"
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-emerald-400 text-xs font-bold">{yesPercent}% {issue.lang === "en" ? "Support" : "찬성"}</span>
          <span className="text-rose-400 text-xs font-bold">{issue.lang === "en" ? "Oppose" : "반대"} {noPercent}%</span>
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

      {/* vote buttons */}
      <div className="grid grid-cols-2 gap-2 p-3 border-t border-[var(--card-border)]">
        {voted ? (
          <div className="col-span-2 flex items-center justify-center gap-2 py-3">
            <AnimatePresence>
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2"
              >
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <div className="flex items-center gap-2">
                    <Coins size={16} className="text-yellow-400" />
                    <span className="text-white font-semibold text-sm">+10 VTX {issue.lang === "en" ? "rewarded!" : "보상 지급!"}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${voted === "yes" ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}>
                      {voted === "yes" ? (issue.lang === "en" ? "👍 Support" : "👍 찬성") : (issue.lang === "en" ? "👎 Oppose" : "👎 반대")}
                    </span>
                  </div>
                  {onChainLoading && (
                    <p className="text-indigo-400 text-xs flex items-center gap-1">
                      <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                      Recording on Solana...
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
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleVote("yes")}
              className="flex items-center justify-center gap-2 py-3 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold rounded-xl transition-all"
            >
              <ThumbsUp size={16} /> {issue.lang === "en" ? "Support" : "찬성"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleVote("no")}
              className="flex items-center justify-center gap-2 py-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 font-bold rounded-xl transition-all"
            >
              <ThumbsDown size={16} /> {issue.lang === "en" ? "Oppose" : "반대"}
            </motion.button>
          </>
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
  const { wallets } = useWallets();
  const privyWallet = wallets[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anchorWallet: any = privyWallet
    ? {
        publicKey: new PublicKey(privyWallet.address),
        signTransaction: (tx: unknown) => privyWallet.signTransaction({ transaction: tx as never }).then((r) => r.signedTransaction as unknown),
        signAllTransactions: async (txs: unknown[]) => {
          const results = await Promise.all(txs.map((tx) => privyWallet.signTransaction({ transaction: tx as never })));
          return results.map((r) => r.signedTransaction as unknown);
        },
      }
    : undefined;

  const categoriesEn = ["All", "Tech & AI", "Labor & Economy", "Finance & Tax", "Energy & Climate"];
  const categoriesKo = ["전체", "기술·AI", "노동·경제", "금융·세금", "에너지·환경"];
  const categories = lang === "en" ? categoriesEn : categoriesKo;

  const byLang = MOCK_ISSUES.filter((i) => i.lang === lang);
  const filtered = filter === "All" || filter === "전체"
    ? byLang
    : byLang.filter((i) => i.category === filter);

  function handleVote(id: string, choice: "yes" | "no") {
    setVotes((prev) => ({ ...prev, [id]: choice }));
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
      {/* top bar */}
      <div className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--card-border)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">🗳️ {lang === "en" ? "Today's Issues" : "오늘의 안건"}</h1>
            <p className="text-[var(--muted)] text-xs">{byLang.length} {lang === "en" ? "live now" : "개 진행 중"}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* lang toggle */}
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
        {/* auth status bar */}
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

        {/* category filter */}
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

      {/* cards */}
      <div className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-4">
        <AnimatePresence>
          {filtered.map((issue) => (
            <VoteCard
              key={issue.id}
              issue={issue}
              onVote={handleVote}
              voted={votes[issue.id] ?? null}
              anchorWallet={anchorWallet}
            />
          ))}
        </AnimatePresence>
      </div>

      <Navbar />
    </div>
  );
}
