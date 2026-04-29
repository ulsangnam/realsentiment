"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Users, TrendingUp, ExternalLink } from "lucide-react";
import Navbar from "@/components/Navbar";
import { fetchAllPoliticians, type OnChainPolitician } from "@/lib/queries";

// Politician IDs by language region
const KO_IDS = ["yoon-sy", "moon-ji", "lee-jm", "cho-guk"];
const EN_IDS  = ["trump", "biden", "harris", "sanders"];

const LEANING: Record<string, Record<number, { text: string; color: string }>> = {
  en: {
    [-1]: { text: "Progressive", color: "#34d399" },
    0:    { text: "Centrist",    color: "#94a3b8" },
    1:    { text: "Conservative",color: "#f97316" },
  },
  ko: {
    [-1]: { text: "진보", color: "#34d399" },
    0:    { text: "중도", color: "#94a3b8" },
    1:    { text: "보수", color: "#f97316" },
  },
};

const FILTERS: Record<string, string[]> = {
  en: ["All", "Progressive", "Centrist", "Conservative"],
  ko: ["전체", "진보", "중도", "보수"],
};

const SCORE_COLORS = ["#ef4444", "#f97316", "#94a3b8", "#34d399", "#10b981"];

function ApprovalBar({ scores, voteCount }: { scores: number[]; voteCount: number }) {
  const total = voteCount || 1;
  return (
    <div className="flex rounded-full overflow-hidden h-1.5 w-full">
      {scores.map((cnt, i) => (
        <div key={i} style={{ width: `${(cnt / total) * 100}%`, background: SCORE_COLORS[i] }} className="h-full transition-all" />
      ))}
    </div>
  );
}

function PoliticianCard({ politician, lang }: { politician: OnChainPolitician; lang: string }) {
  const router = useRouter();
  const leaningMap = LEANING[lang] ?? LEANING.ko;
  const leaning = leaningMap[politician.leaning] ?? leaningMap[0];

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
        <div className="text-right">
          <p className="text-white font-bold text-2xl">{politician.approvalRate}<span className="text-sm text-[var(--muted)]">%</span></p>
          <p className="text-[var(--muted)] text-[10px]">{lang === "en" ? "Approval" : "지지율"}</p>
        </div>
      </div>
      <ApprovalBar scores={politician.scores} voteCount={politician.voteCount} />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1 text-[var(--muted)] text-xs">
          <Users size={11} />
          {politician.voteCount.toLocaleString()} {lang === "en" ? "ratings" : "명 평가"}
        </div>
        <span className="text-[var(--muted)] text-xs">{lang === "en" ? "Avg" : "평균"} {politician.avgScore.toFixed(2)}</span>
      </div>
    </motion.div>
  );
}

export default function PoliticiansPage() {
  const [all, setAll] = useState<OnChainPolitician[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"en" | "ko">("en");
  const [filter, setFilter] = useState("All");

  // Sync lang with global localStorage setting
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

  useEffect(() => {
    fetchAllPoliticians().then(setAll).finally(() => setLoading(false));
  }, []);

  function switchLang(l: "en" | "ko") {
    setLang(l);
    setFilter(l === "en" ? "All" : "전체");
    localStorage.setItem("rs_lang", l);
    window.dispatchEvent(new StorageEvent("storage", { key: "rs_lang", newValue: l }));
  }

  const allowedIds = lang === "en" ? EN_IDS : KO_IDS;
  const leaningMap = LEANING[lang];
  const filters = FILTERS[lang];

  const byLang = all.filter((p) => allowedIds.includes(p.politicianId));
  const filtered = (filter === "All" || filter === "전체")
    ? byLang
    : byLang.filter((p) => (leaningMap[p.leaning]?.text ?? "") === filter);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--card-border)]">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-white font-bold text-lg flex items-center gap-2">
                🏛️ {lang === "en" ? "Politician Ratings" : "정치인 지지도"}
              </h1>
              <p className="text-[var(--muted)] text-xs flex items-center gap-1">
                <TrendingUp size={11} />
                {lang === "en" ? "KYC-verified nodes · on-chain" : "KYC 인증 노드 기준 · 온체인 집계"}
              </p>
            </div>
            {/* EN / KO toggle */}
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
          </div>

          {/* Leaning filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-[var(--card)] border border-[var(--card-border)] text-[var(--muted)]"
                }`}
              >
                {f}
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
              <p className="text-[var(--muted)] text-xs">
                {lang === "en" ? "Fetching from blockchain..." : "블록에서 데이터 조회 중..."}
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-3">
            <p className="text-4xl">🏛️</p>
            <p className="text-[var(--muted)] text-sm">
              {lang === "en" ? "No politicians found" : "등록된 정치인이 없어요"}
            </p>
            <a
              href="https://solscan.io/account/24DscDehhLv8WamjRUc3Zj3B9hSt8wPeiiLCFX7r1XWy?cluster=devnet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-indigo-400 text-xs"
            >
              <ExternalLink size={11} />
              Solscan
            </a>
          </div>
        ) : (
          filtered.map((p, i) => (
            <motion.div key={p.politicianId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-[var(--muted)] text-xs font-mono">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                </span>
              </div>
              <PoliticianCard politician={p} lang={lang} />
            </motion.div>
          ))
        )}
      </div>

      <Navbar />
    </div>
  );
}
