"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Coins, ExternalLink } from "lucide-react";
import type { DbIssue } from "@/lib/supabase";
import type { OnChainIssue } from "@/lib/queries";

const SCORE_LABELS_KO = ["매우반대", "반대", "중립", "찬성", "매우찬성"];
const SCORE_LABELS_EN = ["Strongly\nOppose", "Oppose", "Neutral", "Support", "Strongly\nSupport"];
export const SCORE_COLORS = ["#ef4444", "#f97316", "#94a3b8", "#34d399", "#10b981"];
const SCORE_EMOJI = ["😡", "🙁", "😐", "🙂", "😊"];

/** Returns a human-readable time-until-expiry string. */
export function expiresInText(expiresAt: string, lang: "en" | "ko"): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return lang === "en" ? "Expired" : "만료됨";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return lang === "en" ? `${days}d ${hours}h` : `${days}일 ${hours}시간`;
  return lang === "en" ? `${hours}h` : `${hours}시간`;
}

export interface VoteCardProps {
  issue: DbIssue;
  voted: number | null;
  walletReady: boolean;
  voterAddress: string | null;
  /** True when the user can still revise this issue today. */
  canModify: boolean;
  onChainVote: (issueId: string, score: number) => Promise<string | null>;
  onVoteDone: (id: string, score: number) => void;
  onAlreadyVoted: (id: string, score: number) => void;
  /** Posts a revision to /api/revise-vote; throws on error. */
  onReviseVote: (issueId: string, oldScore: number, newScore: number) => Promise<void>;
}

/**
 * Finds the first transaction that created the vote record PDA,
 * then links to that transaction on Solscan so the user can see the memo.
 */
function SolscanVoteLink({ voterAddress, issueId, isEN }: { voterAddress: string; issueId: string; isEN: boolean }) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { PublicKey, Connection, clusterApiUrl } = await import("@solana/web3.js");
        const { getVotePDA } = await import("@/lib/solana");
        const pda = getVotePDA(new PublicKey(voterAddress), issueId);
        const conn = new Connection(clusterApiUrl("devnet"), "confirmed");
        // The creation tx is the oldest one — fetch last (oldest) signature for this PDA
        const sigs = await conn.getSignaturesForAddress(pda, { limit: 10 });
        const oldest = sigs[sigs.length - 1];
        if (!cancelled) {
          if (oldest) {
            setHref(`https://solscan.io/tx/${oldest.signature}?cluster=devnet`);
          } else {
            // fallback: account page (vote may not be on chain)
            setHref(`https://solscan.io/account/${pda.toBase58()}?cluster=devnet`);
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [voterAddress, issueId]);

  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
    >
      <ExternalLink size={11} />
      {isEN ? "View on Solscan" : "Solscan에서 보기"}
    </a>
  );
}

/** Animated score distribution bar + emoji breakdown shown after voting. */
function CommunityResults({ data, isEN }: { data: OnChainIssue; isEN: boolean }) {
  const total = data.voteCount || 1;
  return (
    <div className="w-full pt-3 mt-1 border-t border-[var(--card-border)]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[var(--muted)] text-[10px] font-medium">
          {isEN ? "Community sentiment" : "커뮤니티 의견"}
        </span>
        <span className="text-[var(--muted)] text-[10px] font-mono">
          {data.voteCount.toLocaleString()} {isEN ? "votes" : "명"} · avg {data.avgScore.toFixed(1)}
        </span>
      </div>
      {/* Animated stacked bar */}
      <div className="flex rounded-full overflow-hidden h-2.5 w-full mb-2.5 bg-[var(--card-border)]">
        {data.scores.map((cnt, i) => (
          <motion.div
            key={i}
            initial={{ width: 0 }}
            animate={{ width: `${(cnt / total) * 100}%` }}
            transition={{ duration: 0.55, delay: i * 0.04, ease: "easeOut" }}
            style={{ background: SCORE_COLORS[i] }}
            className="h-full"
          />
        ))}
      </div>
      {/* Emoji + count grid */}
      <div className="grid grid-cols-5 gap-0.5">
        {data.scores.map((cnt, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-sm">{SCORE_EMOJI[i]}</span>
            <span
              className="text-[9px] font-bold font-mono"
              style={{ color: SCORE_COLORS[i] }}
            >
              {cnt}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * VoteCard — renders a single issue card with voting and vote-revision UI.
 *
 * After voting, fetches on-chain aggregate results and shows a community
 * sentiment distribution so the user can see how they compare to others.
 */
export default function VoteCard({
  issue,
  voted,
  walletReady,
  voterAddress,
  canModify,
  onChainVote,
  onVoteDone,
  onAlreadyVoted,
  onReviseVote,
}: VoteCardProps) {
  const [txSig, setTxSig] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localVoted, setLocalVoted] = useState<number | null>(voted);

  // Revision UI state
  const [modifying, setModifying] = useState(false);
  const [revised, setRevised] = useState(false);

  // On-chain aggregate results (fetched after voting)
  const [onChainData, setOnChainData] = useState<OnChainIssue | null>(null);

  // Sync prop → local state; clear stale error when history confirms vote
  useEffect(() => {
    setLocalVoted(voted);
    if (voted !== null) setError(null);
  }, [voted]);

  // Fetch community results whenever the card enters voted state
  useEffect(() => {
    if (localVoted === null) return;
    let cancelled = false;
    (async () => {
      try {
        const { fetchIssue } = await import("@/lib/queries");
        const data = await fetchIssue(issue.id);
        if (!cancelled && data) setOnChainData(data);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [localVoted, issue.id]);

  const isEN = issue.lang === "en";
  const scoreLabels = isEN ? SCORE_LABELS_EN : SCORE_LABELS_KO;
  const votedColor = localVoted !== null ? SCORE_COLORS[localVoted - 1] : "#94a3b8";
  const votedLabel = localVoted !== null ? scoreLabels[localVoted - 1] : null;

  /**
   * Handles a brand-new vote submission.
   * Pre-checks if a VoteRecord already exists on-chain to avoid duplicates.
   */
  async function handleVote(score: number) {
    if (localVoted !== null || !walletReady) return;
    setLoading(true);
    setError(null);
    try {
      // Pre-check: VoteRecord already on chain?
      if (voterAddress) {
        const { fetchIssueVoteRecord } = await import("@/lib/queries");
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
      // Re-check on-chain: Privy simulates client-side before signing,
      // so "already in use" errors arrive here before the API is even called.
      if (voterAddress) {
        try {
          const { fetchIssueVoteRecord } = await import("@/lib/queries");
          const existing = await fetchIssueVoteRecord(voterAddress, issue.id);
          if (existing !== null) {
            setLocalVoted(existing);
            onAlreadyVoted(issue.id, existing);
            return;
          }
        } catch {}
      }
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("already_voted")) {
        setLocalVoted(score);
        onAlreadyVoted(issue.id, score);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRevise(newScore: number) {
    if (localVoted === null || newScore === localVoted) {
      setModifying(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onReviseVote(issue.id, localVoted, newScore);
      setLocalVoted(newScore);
      setModifying(false);
      setRevised(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
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
      {/* --- Card Header --- */}
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

        {/* Title row — shows "취소" inline when modifying */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-white font-bold text-base leading-snug">{issue.title}</h3>
          {modifying && (
            <button
              onClick={() => setModifying(false)}
              className="text-[var(--muted)] text-xs shrink-0 hover:text-white transition-colors"
            >
              취소
            </button>
          )}
        </div>
        <p className="text-[var(--muted)] text-xs leading-relaxed line-clamp-2">{issue.summary}</p>
      </div>

      {/* --- Vote Section --- */}
      <div className="p-3 border-t border-[var(--card-border)]">
        {localVoted !== null ? (
          <div className="flex flex-col items-center gap-2 py-1">
            {/* Voted score badge + VTX reward */}
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

            {/* On-chain recording indicator */}
            {loading && (
              <p className="text-indigo-400 text-xs flex items-center gap-1">
                <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                {isEN ? "Recording on Solana..." : "솔라나 기록 중..."}
              </p>
            )}

            {/* Community results — shown once on-chain data is fetched */}
            {onChainData && onChainData.voteCount > 0 && (
              <CommunityResults data={onChainData} isEN={isEN} />
            )}

            {/* Related issues — shown only when the crawled issue has linked IDs */}
            {issue.related_issue_ids && issue.related_issue_ids.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span className="text-[var(--muted)] text-[9px]">{isEN ? "Related:" : "관련:"}</span>
                {issue.related_issue_ids.map((id) => (
                  <span
                    key={id}
                    className="text-[9px] font-mono bg-indigo-900/30 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-800/30"
                  >
                    {id}
                  </span>
                ))}
              </div>
            )}

            {/* Solscan links */}
            <div className="flex items-center gap-3">
              {txSig && (
                <a
                  href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
                >
                  <ExternalLink size={11} />
                  {isEN ? "Tx" : "트랜잭션"}
                </a>
              )}
              {voterAddress && (
                <SolscanVoteLink voterAddress={voterAddress} issueId={issue.id} isEN={isEN} />
              )}
            </div>

            {/* Error message (only when no tx sig) */}
            {error && !txSig && (
              <p className="text-rose-400 text-[10px] max-w-[240px] break-all">⚠ {error}</p>
            )}

            {/* Revision confirmed message */}
            {revised && (
              <p className="text-[var(--muted)] text-[10px]">✓ {isEN ? "Revised" : "수정됨"}</p>
            )}

            {/* Score picker — visible while modifying */}
            {modifying && !loading && (
              <div className="grid grid-cols-5 gap-1.5 w-full mt-1">
                {[1, 2, 3, 4, 5].map((score) => (
                  <motion.button
                    key={score}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleRevise(score)}
                    disabled={loading}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-[10px] font-bold leading-tight disabled:opacity-50"
                    style={{
                      color: SCORE_COLORS[score - 1],
                      borderColor: SCORE_COLORS[score - 1] + "50",
                      background: SCORE_COLORS[score - 1] + "12",
                    }}
                  >
                    <span className="text-base">{SCORE_EMOJI[score - 1]}</span>
                    <span className="text-center whitespace-pre-line">{scoreLabels[score - 1]}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {/* Revision action row — visible when not modifying */}
            {!modifying && !loading && !revised && (
              canModify ? (
                <button
                  onClick={() => setModifying(true)}
                  className="text-[var(--muted)] text-[11px] hover:text-indigo-400 transition-colors"
                >
                  {isEN ? "Revise opinion" : "의견 수정"}
                </button>
              ) : (
                <p className="text-[var(--muted)] text-[10px]">
                  {isEN ? "Revision used today" : "오늘 수정 완료"}
                </p>
              )
            )}
          </div>
        ) : (
          /* --- Unvoted: score selection grid --- */
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
                <span className="text-base">{SCORE_EMOJI[score - 1]}</span>
                <span className="text-center whitespace-pre-line">{scoreLabels[score - 1]}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
