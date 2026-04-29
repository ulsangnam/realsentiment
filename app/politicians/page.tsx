"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import { fetchAllPoliticians, type OnChainPolitician } from "@/lib/queries";

const LEANING_LABEL: Record<number, { text: string; color: string }> = {
  [-1]: { text: "진보", color: "#34d399" },
  0:   { text: "중도", color: "#94a3b8" },
  1:   { text: "보수", color: "#f97316" },
};

const SCORE_COLORS = ["#ef4444", "#f97316", "#94a3b8", "#34d399", "#10b981"];

function ApprovalBar({ scores, voteCount }: { scores: number[]; voteCount: number }) {
  const total = voteCount || 1;
  return (
    <div className="flex rounded-full overflow-hidden h-1.5 w-full">
      {scores.map((cnt, i) => (
        <div
          key={i}
          style={{ width: `${(cnt / total) * 100}%`, background: SCORE_COLORS[i] }}
          className="h-full transition-all"
        />
      ))}
    </div>
  );
}

function PoliticianCard({ politician }: { politician: OnChainPolitician }) {
  const router = useRouter();
  const leaning = LEANING_LABEL[politician.leaning] ?? LEANING_LABEL[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => router.push(`/politicians/${politician.politicianId}`)}
      className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4 cursor-pointer hover:border-indigo-700/50 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-white font-bold text-base">{politician.name}</h3>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
              style={{ color: leaning.color, borderColor: leaning.color + "50", background: leaning.color + "15" }}
            >
              {leaning.text}
            </span>
          </div>
          <p className="text-[var(--muted)] text-xs">{politician.party} · {politician.role}</p>
        </div>
        {/* 지지율 수치 */}
        <div className="text-right">
          <p className="text-white font-bold text-2xl">{politician.approvalRate}<span className="text-sm text-[var(--muted)]">%</span></p>
          <p className="text-[var(--muted)] text-[10px]">지지율</p>
        </div>
      </div>

      {/* 분포 바 */}
      <ApprovalBar scores={politician.scores} voteCount={politician.voteCount} />

      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 text-[var(--muted)] text-xs">
          <Users size={11} />
          {politician.voteCount.toLocaleString()}명 평가
        </div>
        <span className="text-[var(--muted)] text-xs">평균 {politician.avgScore.toFixed(2)}점</span>
      </div>
    </motion.div>
  );
}

export default function PoliticiansPage() {
  const [politicians, setPoliticians] = useState<OnChainPolitician[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "진보" | "중도" | "보수">("all");

  useEffect(() => {
    fetchAllPoliticians().then(setPoliticians).finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all"
    ? politicians
    : politicians.filter((p) => (LEANING_LABEL[p.leaning]?.text ?? "중도") === filter);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--card-border)]">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-white font-bold text-lg flex items-center gap-2">
                🏛️ 정치인 지지도
              </h1>
              <p className="text-[var(--muted)] text-xs flex items-center gap-1">
                <TrendingUp size={11} />
                KYC 인증 노드 기준 · 온체인 집계
              </p>
            </div>
          </div>

          {/* 성향 필터 */}
          <div className="flex gap-2">
            {(["all", "진보", "중도", "보수"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)]"
                }`}
              >
                {f === "all" ? "전체" : f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-[var(--muted)] text-xs">블록에서 데이터 조회 중...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <p className="text-4xl">🏛️</p>
            <p className="text-[var(--muted)] text-sm">등록된 정치인이 없어요</p>
            <a
              href="https://solscan.io/account/24DscDehhLv8WamjRUc3Zj3B9hSt8wPeiiLCFX7r1XWy?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-indigo-400 text-xs"
            >
              <ExternalLink size={11} />
              Solscan에서 직접 확인
            </a>
          </div>
        ) : (
          filtered.map((p, i) => (
            <motion.div
              key={p.politicianId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              {/* 순위 뱃지 */}
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[var(--muted)] text-xs font-mono">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
              </div>
              <PoliticianCard politician={p} />
            </motion.div>
          ))
        )}
      </div>

      <Navbar />
    </div>
  );
}
