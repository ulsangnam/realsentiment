"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Coins, TrendingUp, ArrowDownToLine, Lock, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import { MOCK_SBTS, MOCK_USER, RARITY_COLORS, type SBT } from "@/lib/mockData";

const weeklyDataEn = [
  { day: "Mon", earned: 30 },
  { day: "Tue", earned: 50 },
  { day: "Wed", earned: 20 },
  { day: "Thu", earned: 80 },
  { day: "Fri", earned: 40 },
  { day: "Sat", earned: 60 },
  { day: "Sun", earned: 110 },
];

const weeklyDataKo = [
  { day: "월", earned: 30 },
  { day: "화", earned: 50 },
  { day: "수", earned: 20 },
  { day: "목", earned: 80 },
  { day: "금", earned: 40 },
  { day: "토", earned: 60 },
  { day: "일", earned: 110 },
];

const RARITY_LABEL_EN = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };
const RARITY_LABEL_KO = { common: "일반", rare: "희귀", epic: "영웅", legendary: "전설" };

function SBTCard({ sbt, index, lang }: { sbt: SBT; index: number; lang: "en" | "ko" }) {
  const [flipped, setFlipped] = useState(false);
  const rarityLabel = lang === "en" ? RARITY_LABEL_EN[sbt.rarity] : RARITY_LABEL_KO[sbt.rarity];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06 }}
      onClick={() => setFlipped(!flipped)}
      className="cursor-pointer"
      style={{ perspective: 600 }}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d", position: "relative" }}
        className="h-28"
      >
        <div
          className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${sbt.color} p-3 flex flex-col items-center justify-center border border-white/10`}
          style={{ backfaceVisibility: "hidden" }}
        >
          <span className="text-3xl mb-1">{sbt.icon}</span>
          <p className="text-white text-xs font-bold text-center leading-tight">{sbt.name}</p>
          <span className={`text-[10px] mt-1 px-2 py-0.5 rounded-full border font-medium ${RARITY_COLORS[sbt.rarity]}`}>
            {rarityLabel}
          </span>
        </div>

        <div
          className="absolute inset-0 rounded-2xl bg-[var(--card)] border border-[var(--card-border)] p-3 flex flex-col items-center justify-center text-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="text-white text-xs font-semibold mb-1">{sbt.name}</p>
          <p className="text-[var(--muted)] text-[10px] leading-tight mb-2">{sbt.description}</p>
          <p className="text-indigo-400 text-[10px]">{lang === "en" ? "Earned" : "획득"} {sbt.earnedAt}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function RewardsPage() {
  const [displayBalance, setDisplayBalance] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [lang, setLang] = useState<"en" | "ko">("en");

  useEffect(() => {
    const stored = localStorage.getItem("rs_lang") as "en" | "ko" | null;
    if (stored) setLang(stored);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "rs_lang" && (e.newValue === "en" || e.newValue === "ko")) {
        setLang(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let frame: number;
    const target = MOCK_USER.balance;
    const step = target / 60;
    let current = 0;
    function animate() {
      current = Math.min(current + step, target);
      setDisplayBalance(Math.floor(current * 10) / 10);
      if (current < target) frame = requestAnimationFrame(animate);
    }
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  function handleClaim() {
    if (claimed) return;
    setClaiming(true);
    setTimeout(() => { setClaiming(false); setClaimed(true); }, 2000);
  }

  const weeklyData = lang === "en" ? weeklyDataEn : weeklyDataKo;
  const rarityLabels = lang === "en" ? RARITY_LABEL_EN : RARITY_LABEL_KO;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="sticky top-0 z-40 bg-[var(--background)]/90 backdrop-blur-xl border-b border-[var(--card-border)]">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="text-white font-bold text-lg">💎 {lang === "en" ? "My Rewards" : "내 보상"}</h1>
          <p className="text-[var(--muted)] text-xs">{lang === "en" ? "Vote rewards & SBT collection" : "투표 기여 보상 및 SBT 컬렉션"}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-28 space-y-4">
        {/* balance card */}
        <div className="bg-gradient-to-br from-indigo-900/60 to-purple-900/60 border border-indigo-700/40 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-indigo-300 text-xs mb-1">{lang === "en" ? "VTX Balance" : "보유 VTX"}</p>
              <motion.p key={displayBalance} className="text-white text-4xl font-black tracking-tight">
                {displayBalance.toLocaleString()}
              </motion.p>
              <p className="text-indigo-400 text-xs mt-1">≈ ₩{(displayBalance * 12.4).toLocaleString()} KRW</p>
            </div>
            <div className="text-right">
              <p className="text-indigo-300 text-xs mb-1">{MOCK_USER.rankIcon} {lang === "en" ? "Rank" : "등급"}</p>
              <p className="text-white font-bold text-lg">{MOCK_USER.rank}</p>
              <p className="text-indigo-400 text-xs">{lang === "en" ? `${MOCK_USER.totalVotes} votes` : `투표 ${MOCK_USER.totalVotes}회`}</p>
            </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins size={16} className="text-yellow-400" />
              <div>
                <p className="text-yellow-300 text-xs font-semibold">{lang === "en" ? "Pending Rewards" : "미지급 보상"}</p>
                <p className="text-yellow-400 text-lg font-bold">{MOCK_USER.pendingRewards} VTX</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleClaim}
              disabled={claiming || claimed}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                claimed ? "bg-green-600 text-white" : "bg-yellow-500 hover:bg-yellow-400 text-black"
              } disabled:opacity-60`}
            >
              {claiming ? (
                <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowDownToLine size={14} />
              )}
              {claimed
                ? (lang === "en" ? "Claimed!" : "수령 완료!")
                : claiming
                ? (lang === "en" ? "Processing..." : "처리 중...")
                : (lang === "en" ? "Claim" : "수령하기")}
            </motion.button>
          </div>
        </div>

        {/* stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: lang === "en" ? "Total Earned" : "총 획득", val: "1,284 VTX", icon: TrendingUp, color: "text-emerald-400" },
            { label: lang === "en" ? "This Week" : "이번 주", val: "390 VTX", icon: Star, color: "text-indigo-400" },
            { label: lang === "en" ? "Wallet" : "지갑 주소", val: MOCK_USER.address, icon: Lock, color: "text-[var(--muted)]" },
          ].map(({ label, val, icon: Icon, color }) => (
            <div key={label} className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-3">
              <Icon size={14} className={`${color} mb-1.5`} />
              <p className="text-[var(--muted)] text-[10px]">{label}</p>
              <p className="text-white text-xs font-bold truncate">{val}</p>
            </div>
          ))}
        </div>

        {/* weekly chart */}
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4">
          <h2 className="text-white font-semibold text-sm mb-3">{lang === "en" ? "Weekly Rewards" : "주간 보상 추이"}</h2>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={weeklyData} barSize={18}>
              <XAxis dataKey="day" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: "#0f0f1a", border: "1px solid #1e1e35", borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`${v} VTX`]}
                labelStyle={{ color: "#94a3b8" }}
              />
              <Bar dataKey="earned" radius={[4, 4, 0, 0]}>
                {weeklyData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={i === weeklyData.length - 1 ? "#6366f1" : "#1e1e35"}
                    stroke={i === weeklyData.length - 1 ? "#818cf8" : "transparent"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SBT gallery */}
        <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">{lang === "en" ? "SBT Collection" : "SBT 컬렉션"}</h2>
              <p className="text-[var(--muted)] text-xs">{lang === "en" ? "Tap a card to see details" : "카드를 탭하면 상세 정보를 볼 수 있어요"}</p>
            </div>
            <span className="text-indigo-400 text-xs font-semibold bg-indigo-900/40 px-2.5 py-1 rounded-full border border-indigo-800/40">
              {MOCK_SBTS.length} {lang === "en" ? "badges" : "개"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {MOCK_SBTS.map((sbt, i) => (
              <SBTCard key={sbt.id} sbt={sbt} index={i} lang={lang} />
            ))}
          </div>

          <div className="mt-4 p-3 bg-indigo-950/40 border border-indigo-800/30 rounded-xl">
            <div className="flex gap-3">
              {(["common", "rare", "epic", "legendary"] as const).map((r) => (
                <div key={r} className="flex items-center gap-1">
                  <span className={`text-[10px] font-medium ${RARITY_COLORS[r].split(" ")[0]}`}>
                    {rarityLabels[r]}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[var(--muted)] text-[10px] mt-1">
              {lang === "en" ? "SBTs are non-transferable — permanently recorded on Solana" : "SBT는 양도 불가능합니다 — 블록체인에 영구 기록됩니다"}
            </p>
          </div>
        </div>
      </div>

      <Navbar />
    </div>
  );
}
