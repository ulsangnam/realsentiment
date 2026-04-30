"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Coins, Shield, ExternalLink, Phone } from "lucide-react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignTransaction, useCreateWallet } from "@privy-io/react-auth/solana";
import Navbar from "@/components/Navbar";
import VerifyGuideModal from "@/components/VerifyGuideModal";
import { buildVoteTransaction } from "@/lib/solana";
import { fetchVoterHistory, fetchIssueVoteRecord } from "@/lib/queries";
import type { DbIssue } from "@/lib/supabase";

const SCORE_LABELS_KO = ["매우반대", "반대", "중립", "찬성", "매우찬성"];
const SCORE_LABELS_EN = ["Strongly\nOppose", "Oppose", "Neutral", "Support", "Strongly\nSupport"];
const SCORE_COLORS = ["#ef4444", "#f97316", "#94a3b8", "#34d399", "#10b981"];

type VoteState = Record<string, number | null>;

function expiresInText(expiresAt: string, lang: "en" | "ko"): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return lang === "en" ? "Expired" : "만료됨";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return lang === "en" ? `${days}d ${hours}h` : `${days}일 ${hours}시간`;
  return lang === "en" ? `${hours}h` : `${hours}시간`;
}

function VoteCard({
  issue,
  voted,
  walletReady,
  onChainVote,
  onVoteDone,
}: {
  issue: DbIssue;
  voted: number | null;
  walletReady: boolean;
  voterAddress: string | null;
  onChainVote: (issueId: string, score: number) => Promise<string | null>;
  onVoteDone: (id: string, score: number) => void;
  onAlreadyVoted: (id: string, score: number) => void;
}) {
  const [txSig, setTxSig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localVoted, setLocalVoted] = useState<number | null>(voted);

  // sync prop → local (for when parent pre-loads history)
  useEffect(() => { setLocalVoted(voted); }, [voted]);

  const isEN = issue.lang === "en";
  const scoreLabels = isEN ? SCORE_LABELS_EN : SCORE_LABELS_KO;
  const votedColor = localVoted !== null ? SCORE_COLORS[localVoted - 1] : "#94a3b8";
  const votedLabel = localVoted !== null ? scoreLabels[localVoted - 1] : null;

  async function handleVote(score: number) {
    if (localVoted !== null || !walletReady) return;
    setLoading(true);
    setError(null);
    try {
      // Pre-check: VoteRecord already on chain?
      if (voterAddress) {
        const existing = await fetchIssueVoteRecord(voterAddress, issue.id);
        if (existing !== null) {
          setLocalVoted(existing);
          onAlreadyVoted(issue.id, existing);
          return;
        }
      }
      const sig = await onChainVote(issue.id, score);
      if (sig) setTxSig(sig);
      setLocalVoted(score);
      onVoteDone(issue.id, score);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already in use") || msg.includes("0x0")) {
        // fallback: couldn't pre-check, treat as already voted
        setLocalVoted(score);
        onAlreadyVoted(issue.id, score);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
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
            {isEN ? "🇺🇸" : "🇰🇷"} {issue.category}
          </span>
          <div className="flex items-center gap-1 text-[var(--muted)] text-xs">
            <Clock size={12} />
            {expiresInText(issue.expires_at, issue.lang)} {isEN ? "left" : "남음"}
          </div>
        </div>
        <h3 className="text-white font-bold text-base leading-snug mb-1">{issue.title}</h3>
        <p className="text-[var(--muted)] text-xs leading-relaxed line-clamp-2">{issue.summary}</p>
      </div>

      {/* vote section */}
      <div className="p-3 border-t border-[var(--card-border)]">
        {localVoted !== null ? (
          <div className="flex flex-col items-center gap-2 py-1">
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
            {loading && (
              <p className="text-indigo-400 text-xs flex items-center gap-1">
                <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                {isEN ? "Recording on Solana..." : "솔라나 기록 중..."}
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
            {error && !txSig && (
              <p className="text-rose-400 text-[10px] max-w-[240px] break-all">⚠ {error}</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-1.5">
            {!walletReady && (
              <div className="col-span-5 flex justify-center py-2">
                <span className="w-4 h-4 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {error && (
              <p className="col-span-5 text-rose-400 text-[10px] text-center break-all">⚠ {error}</p>
            )}
            {walletReady && [1, 2, 3, 4, 5].map((score) => (
              <motion.button
                key={score}
                whileTap={{ scale: 0.92 }}
                onClick={() => handleVote(score)}
                disabled={loading}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-[10px] font-bold leading-tight disabled:opacity-50"
                style={{
                  color: SCORE_COLORS[score - 1],
                  borderColor: SCORE_COLORS[score - 1] + "50",
                  background: SCORE_COLORS[score - 1] + "12",
                }}
              >
                <span className="text-base">{["😡", "🙁", "😐", "🙂", "😊"][score - 1]}</span>
                <span className="text-center whitespace-pre-line">{scoreLabels[score - 1]}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function VotePage() {
  const [issues, setIssues] = useState<DbIssue[]>([]);
  const [issuesLoading, setIssuesLoading] = useState(true);
  const [votes, setVotes] = useState<VoteState>({});
  const [historyLoading, setHistoryLoading] = useState(false);
  const [totalEarned, setTotalEarned] = useState(50);
  const [lang, setLang] = useState<"en" | "ko">("en");
  const [filter, setFilter] = useState("All");
  const [guideOpen, setGuideOpen] = useState(false);
  const [showVoted, setShowVoted] = useState(false);

  const { authenticated, login, user, linkPhone } = usePrivy();
  const hasPhone = user?.linkedAccounts?.some((a) => a.type === "phone") ?? false;
  const { wallets, ready: walletsReady } = useWallets();
  const { signTransaction } = useSignTransaction();
  const { createWallet } = useCreateWallet();

  const privyWallet = wallets.find(
    (w) => ("walletClientType" in w && (w as Record<string, unknown>).walletClientType === "privy") ||
           ("name" in w && String((w as Record<string, unknown>).name).toLowerCase().includes("privy"))
  ) ?? null;
  const activeWallet = privyWallet ?? wallets[0] ?? null;
  // Ready = wallets loaded AND a wallet actually exists AND history done
  const walletReady = walletsReady && !historyLoading && !!activeWallet;

  // Restore lang from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("rs_lang") as "en" | "ko" | null;
    if (stored) {
      setLang(stored);
      setFilter(stored === "en" ? "All" : "전체");
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === "rs_lang" && (e.newValue === "en" || e.newValue === "ko")) {
        setLang(e.newValue);
        setFilter(e.newValue === "en" ? "All" : "전체");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Auto-create Privy wallet
  useEffect(() => {
    if (authenticated && walletsReady && wallets.length === 0) {
      createWallet().catch(() => {});
    }
  }, [authenticated, walletsReady, wallets.length]);

  // Load existing vote records so already-voted issues show correctly
  useEffect(() => {
    if (!activeWallet) return;
    setHistoryLoading(true);
    fetchVoterHistory(activeWallet.address)
      .then((history) => {
        const map: VoteState = {};
        for (const h of history) map[h.issueId] = h.score;
        setVotes((prev) => ({ ...map, ...prev })); // prev wins if just voted this session
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [activeWallet?.address]);

  // Fetch issues from DB when lang changes
  useEffect(() => {
    setIssuesLoading(true);
    fetch(`/api/issues?lang=${lang}`)
      .then((r) => r.json())
      .then((data) => setIssues(Array.isArray(data) ? data : []))
      .catch(() => setIssues([]))
      .finally(() => setIssuesLoading(false));
  }, [lang]);

  async function onChainVote(issueId: string, score: number): Promise<string | null> {
    const wallet = activeWallet;
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

  function switchLang(l: "en" | "ko") {
    setLang(l);
    setFilter(l === "en" ? "All" : "전체");
    localStorage.setItem("rs_lang", l);
    window.dispatchEvent(new StorageEvent("storage", { key: "rs_lang", newValue: l }));
  }

  // Derive unique categories from loaded issues
  const categories = ["All", ...Array.from(new Set(issues.map((i) => i.category)))];
  const filtered = filter === "All" || filter === "전체"
    ? issues
    : issues.filter((i) => i.category === filter);
  const toVote = filtered.filter((i) => (votes[i.id] ?? null) === null);
  const alreadyVoted = filtered.filter((i) => (votes[i.id] ?? null) !== null);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--card-border)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-lg">🗳️ {lang === "en" ? "Today's Issues" : "오늘의 안건"}</h1>
              <button
                onClick={() => setGuideOpen(true)}
                className="w-5 h-5 rounded-full border border-[var(--card-border)] text-[var(--muted)] hover:text-indigo-400 hover:border-indigo-700 transition-all text-[10px] font-bold flex items-center justify-center"
              >?</button>
            </div>
            <p className="text-[var(--muted)] text-xs">{issues.length} {lang === "en" ? "live now" : "개 진행 중"}</p>
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

        <div className="px-4 pb-2">
          {!authenticated ? (
            <button onClick={login} className="text-indigo-400 text-xs flex items-center gap-1 hover:text-indigo-300 transition-colors">
              <Shield size={12} />
              {lang === "en" ? "Sign in to record votes on-chain" : "로그인 후 온체인 기록"}
            </button>
          ) : !hasPhone ? (
            <p className="text-amber-400 text-xs flex items-center gap-1">
              <Phone size={12} />
              {lang === "en" ? "Phone verification required to vote" : "투표하려면 전화번호 인증 필요"}
            </p>
          ) : (
            <p className="text-emerald-400 text-xs flex items-center gap-1">
              <Shield size={12} />
              {lang === "en" ? "Verified — votes recorded on Solana" : "인증됨 — 솔라나에 기록"}
            </p>
          )}
        </div>

        {/* Category filter — derived from DB */}
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
        {authenticated && !hasPhone ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <Phone size={28} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-white font-bold text-base mb-1">
                {lang === "en" ? "Phone verification required" : "전화번호 인증 필요"}
              </p>
              <p className="text-[var(--muted)] text-sm max-w-[260px]">
                {lang === "en"
                  ? "To prevent duplicate voting, one phone number per account is required."
                  : "중복 투표 방지를 위해 계정당 전화번호 1개 인증이 필요해요."}
              </p>
            </div>
            <button
              onClick={() => linkPhone()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all text-sm"
            >
              {lang === "en" ? "Verify phone number" : "전화번호 인증하기"}
            </button>
          </div>
        ) : issuesLoading ? (
          <div className="flex justify-center py-24">
            <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-2">
            <p className="text-4xl">🗳️</p>
            <p className="text-[var(--muted)] text-sm">
              {lang === "en" ? "No issues available" : "등록된 안건이 없어요"}
            </p>
          </div>
        ) : (
          <>
            {/* 미투표 안건 */}
            {toVote.length === 0 && alreadyVoted.length > 0 && (
              <div className="flex flex-col items-center py-12 gap-2 text-center">
                <p className="text-3xl">🎉</p>
                <p className="text-white font-bold text-base">
                  {lang === "en" ? "All votes cast!" : "모든 안건 투표 완료!"}
                </p>
                <p className="text-[var(--muted)] text-xs">
                  {lang === "en" ? "Check back tomorrow for new issues." : "내일 새 안건이 올라와요."}
                </p>
              </div>
            )}
            <AnimatePresence>
              {toVote.map((issue) => (
                <VoteCard
                  key={issue.id}
                  issue={issue}
                  voted={null}
                  walletReady={walletReady}
                  voterAddress={activeWallet?.address ?? null}
                  onChainVote={onChainVote}
                  onVoteDone={(id, score) => {
                    setVotes((prev) => ({ ...prev, [id]: score }));
                    setTotalEarned((prev) => prev + 10);
                  }}
                  onAlreadyVoted={(id, score) => {
                    setVotes((prev) => ({ ...prev, [id]: score }));
                  }}
                />
              ))}
            </AnimatePresence>

            {/* 기투표 안건 — 접힌 섹션 */}
            {alreadyVoted.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setShowVoted((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-[var(--muted)] text-xs font-medium hover:text-white transition-colors"
                >
                  <span>
                    {lang === "en"
                      ? `✓ Already voted (${alreadyVoted.length})`
                      : `✓ 투표 완료 (${alreadyVoted.length}개)`}
                  </span>
                  <span className="text-[10px]">{showVoted ? "▲" : "▼"}</span>
                </button>
                <AnimatePresence>
                  {showVoted && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 mt-2 overflow-hidden"
                    >
                      {alreadyVoted.map((issue) => (
                        <VoteCard
                          key={issue.id}
                          issue={issue}
                          voted={votes[issue.id] ?? null}
                          walletReady={walletReady}
                          voterAddress={activeWallet?.address ?? null}
                          onChainVote={onChainVote}
                          onVoteDone={(id, score) => {
                            setVotes((prev) => ({ ...prev, [id]: score }));
                          }}
                          onAlreadyVoted={(id, score) => {
                            setVotes((prev) => ({ ...prev, [id]: score }));
                          }}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      <VerifyGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} lang={lang} />
      <Navbar />
    </div>
  );
}
