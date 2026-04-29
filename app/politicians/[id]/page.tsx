"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignTransaction } from "@privy-io/react-auth/solana";
import {
  fetchPolitician,
  fetchPoliticianStances,
  fetchPoliticianVoteRecord,
  getPoliticianPDA,
  getPoliticianVotePDA,
  type OnChainPolitician,
  type PoliticianStance,
} from "@/lib/queries";
import { CONNECTION, PROGRAM_ID } from "@/lib/solana";
import {
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import IDL from "@/lib/idl.json";
import Navbar from "@/components/Navbar";

const SCORE_LABELS = ["매우비지지", "비지지", "중립", "지지", "매우지지"];
const SCORE_EMOJI  = ["😡", "🙁", "😐", "🙂", "😊"];
const SCORE_COLORS = ["#ef4444", "#f97316", "#94a3b8", "#34d399", "#10b981"];
const STANCE_LABEL: Record<number, { text: string; color: string }> = {
  [-1]: { text: "반대", color: "#ef4444" },
  0:    { text: "중립", color: "#94a3b8" },
  1:    { text: "찬성", color: "#34d399" },
};
const LEANING_LABEL: Record<number, { text: string; color: string }> = {
  [-1]: { text: "진보", color: "#34d399" },
  0:    { text: "중도", color: "#94a3b8" },
  1:    { text: "보수", color: "#f97316" },
};

// 알려진 이슈 ID 목록 (나중엔 온체인 레지스트리로 대체)
const KNOWN_ISSUE_IDS = ["e1", "e2", "e3", "e4", "k1", "k2"];

async function buildRatePoliticianTx(
  voterAddress: string,
  politicianId: string,
  score: number,
  feePayerAddress?: string
): Promise<VersionedTransaction> {
  const voter = new PublicKey(voterAddress);
  const feePayer = feePayerAddress ? new PublicKey(feePayerAddress) : voter;
  const politicianPDA = getPoliticianPDA(politicianId);
  const votePDA = getPoliticianVotePDA(voter, politicianId);

  const provider = new AnchorProvider(
    CONNECTION,
    { publicKey: voter, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs },
    { commitment: "confirmed" }
  );
  const program = new Program(IDL as never, provider);

  const ix = await (program.methods as never as {
    ratePolitician: (id: string, score: number) => {
      accounts: (a: object) => { instruction: () => Promise<unknown> }
    }
  }).ratePolitician(politicianId, score)
    .accounts({ politician: politicianPDA, voteRecord: votePDA, voter })
    .instruction();

  const instructions = [];
  if (feePayerAddress && feePayer.toBase58() !== voter.toBase58()) {
    const bal = await CONNECTION.getBalance(voter);
    if (bal < 3_000_000) {
      instructions.push(SystemProgram.transfer({ fromPubkey: feePayer, toPubkey: voter, lamports: 3_000_000 }));
    }
  }
  instructions.push(ix as never);

  const { blockhash } = await CONNECTION.getLatestBlockhash();
  return new VersionedTransaction(
    new TransactionMessage({ payerKey: feePayer, recentBlockhash: blockhash, instructions }).compileToV0Message()
  );
}

function ScoreDistribution({ scores, voteCount }: { scores: number[]; voteCount: number }) {
  const total = voteCount || 1;
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-3 w-full mb-3">
        {scores.map((cnt, i) => (
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
        {scores.map((cnt, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            <span className="text-base">{SCORE_EMOJI[i]}</span>
            <span className="text-xs font-bold" style={{ color: SCORE_COLORS[i] }}>{cnt}</span>
            <span className="text-[9px] text-[var(--muted)] text-center leading-tight">{SCORE_LABELS[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PoliticianDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { authenticated } = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signTransaction } = useSignTransaction();

  const politicianId = params.id;
  const [politician, setPolitician] = useState<OnChainPolitician | null>(null);
  const [stances, setStances] = useState<PoliticianStance[]>([]);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [txSig, setTxSig] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const privyWallet = wallets.find(
    (w) => ("walletClientType" in w && (w as Record<string, unknown>).walletClientType === "privy") ||
           ("name" in w && String((w as Record<string, unknown>).name).toLowerCase().includes("privy"))
  ) ?? wallets[0] ?? null;

  useEffect(() => {
    const load = async () => {
      const [p, s] = await Promise.all([
        fetchPolitician(politicianId),
        fetchPoliticianStances(politicianId, KNOWN_ISSUE_IDS),
      ]);
      setPolitician(p);
      setStances(s);

      if (privyWallet) {
        const existing = await fetchPoliticianVoteRecord(privyWallet.address, politicianId);
        setMyScore(existing);
      }
      setLoading(false);
    };
    load();
  }, [politicianId, privyWallet?.address]);

  async function handleRate(score: number) {
    if (!privyWallet || myScore !== null) return;
    setVoting(true);
    setTxError(null);
    try {
      const feePayerAddress = process.env.NEXT_PUBLIC_FEE_PAYER;
      const tx = await buildRatePoliticianTx(privyWallet.address, politicianId, score, feePayerAddress);
      const serialized = new Uint8Array(tx.serialize());
      const { signedTransaction } = await signTransaction({
        transaction: serialized,
        wallet: privyWallet,
        chain: "solana:devnet",
      });
      const signedTxBase64 = Buffer.from(signedTransaction).toString("base64");
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedTxBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setTxSig(data.signature);
      setMyScore(score);
      // 로컬 반영
      setPolitician((prev) => {
        if (!prev) return prev;
        const scores = [...prev.scores] as [number, number, number, number, number];
        scores[score - 1]++;
        const vc = prev.voteCount + 1;
        const ws = scores.reduce((a, c, i) => a + c * (i + 1), 0);
        return { ...prev, scores, voteCount: vc, avgScore: ws / vc, approvalRate: Math.round(((scores[3] + scores[4]) / vc) * 100) };
      });
    } catch (e) {
      setTxError(e instanceof Error ? e.message : String(e));
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!politician) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center gap-3">
        <p className="text-[var(--muted)]">정치인 정보를 찾을 수 없어요</p>
        <button onClick={() => router.back()} className="text-indigo-400 text-sm">돌아가기</button>
      </div>
    );
  }

  const leaning = LEANING_LABEL[politician.leaning] ?? LEANING_LABEL[0];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* top bar */}
      <div className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--card-border)]">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-[var(--muted)] hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-bold text-base">{politician.name}</h1>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                style={{ color: leaning.color, borderColor: leaning.color + "50", background: leaning.color + "15" }}
              >
                {leaning.text}
              </span>
            </div>
            <p className="text-[var(--muted)] text-xs">{politician.party} · {politician.role}</p>
          </div>
          <a
            href={`https://solscan.io/account/${getPoliticianPDA(politicianId).toBase58()}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-4">

        {/* 지지율 요약 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4"
        >
          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-[var(--muted)] text-xs mb-1">지지율 (KYC 인증 노드 기준)</p>
              <p className="text-white font-bold text-4xl">
                {politician.approvalRate}<span className="text-lg text-[var(--muted)]">%</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[var(--muted)] text-xs">평균 점수</p>
              <p className="text-white font-bold text-2xl">{politician.avgScore.toFixed(2)}</p>
              <p className="text-[var(--muted)] text-[10px]">{politician.voteCount.toLocaleString()}명 평가</p>
            </div>
          </div>
          <ScoreDistribution scores={politician.scores} voteCount={politician.voteCount} />
        </motion.div>

        {/* 지지도 투표 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4"
        >
          <p className="text-[var(--muted)] text-xs mb-3">이 정치인을 평가하세요 — 온체인 기록</p>

          {myScore !== null ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{SCORE_EMOJI[myScore - 1]}</span>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full border"
                  style={{ color: SCORE_COLORS[myScore - 1], borderColor: SCORE_COLORS[myScore - 1] + "50", background: SCORE_COLORS[myScore - 1] + "15" }}
                >
                  {SCORE_LABELS[myScore - 1]}
                </span>
              </div>
              {txSig && (
                <a
                  href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-400 text-xs"
                >
                  <ExternalLink size={11} /> View on Solscan
                </a>
              )}
            </div>
          ) : !authenticated ? (
            <p className="text-[var(--muted)] text-sm text-center py-3">로그인 후 평가 가능</p>
          ) : (
            <>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 3, 4, 5].map((score) => (
                  <motion.button
                    key={score}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleRate(score)}
                    disabled={voting}
                    className="flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all text-[10px] font-bold leading-tight disabled:opacity-50"
                    style={{
                      color: SCORE_COLORS[score - 1],
                      borderColor: SCORE_COLORS[score - 1] + "50",
                      background: SCORE_COLORS[score - 1] + "12",
                    }}
                  >
                    <span className="text-base">{SCORE_EMOJI[score - 1]}</span>
                    <span className="text-center">{SCORE_LABELS[score - 1]}</span>
                  </motion.button>
                ))}
              </div>
              {voting && (
                <p className="text-indigo-400 text-xs text-center mt-2 flex items-center justify-center gap-1">
                  <span className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  솔라나 기록 중...
                </p>
              )}
              {txError && <p className="text-rose-400 text-[10px] mt-2 break-all">⚠ {txError}</p>}
            </>
          )}
        </motion.div>

        {/* 안건별 입장 */}
        {stances.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4"
          >
            <p className="text-[var(--muted)] text-xs mb-3">안건별 공식 입장 (Admin 태깅)</p>
            {stances.map((s) => {
              const sl = STANCE_LABEL[s.stance] ?? STANCE_LABEL[0];
              return (
                <div key={s.issueId} className="flex items-center justify-between py-2.5 border-b border-[var(--card-border)] last:border-0">
                  <p className="text-white text-sm font-medium">{s.issueId}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                      style={{ color: sl.color, borderColor: sl.color + "50", background: sl.color + "15" }}
                    >
                      {sl.text}
                    </span>
                    <ChevronRight size={12} className="text-[var(--muted)]" />
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </div>

      <Navbar />
    </div>
  );
}
