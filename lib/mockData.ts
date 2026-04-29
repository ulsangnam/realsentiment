export type Issue = {
  id: string;
  title: string;
  summary: string;
  category: string;
  country: string;
  flag: string;
  lang: "en" | "ko";
  yesVotes: number;
  noVotes: number;
  totalVoters: number;
  trend: { time: string; yes: number; no: number }[];
  tags: string[];
  expiresIn: string;
};

export type SBT = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: string;
  rarity: "common" | "rare" | "epic" | "legendary";
};

export const MOCK_ISSUES: Issue[] = [
  {
    id: "e1",
    title: "Should AI-generated content require mandatory labeling?",
    summary: "Should governments legally require watermarks or labels on all AI-generated images and text to prevent misinformation?",
    category: "Tech & AI",
    country: "United States",
    flag: "🇺🇸",
    lang: "en",
    yesVotes: 142800,
    noVotes: 57200,
    totalVoters: 200000,
    trend: [
      { time: "9AM", yes: 64, no: 36 },
      { time: "10AM", yes: 67, no: 33 },
      { time: "11AM", yes: 70, no: 30 },
      { time: "12PM", yes: 71, no: 29 },
      { time: "1PM", yes: 71, no: 29 },
      { time: "2PM", yes: 71, no: 29 },
    ],
    tags: ["AI", "regulation", "free speech"],
    expiresIn: "2d 14h",
  },
  {
    id: "e2",
    title: "Should the US adopt a 4-day work week?",
    summary: "Should Congress pass legislation mandating companies to pilot a 4-day work week without reducing employee pay?",
    category: "Labor & Economy",
    country: "United States",
    flag: "🇺🇸",
    lang: "en",
    yesVotes: 178000,
    noVotes: 72000,
    totalVoters: 250000,
    trend: [
      { time: "9AM", yes: 68, no: 32 },
      { time: "10AM", yes: 70, no: 30 },
      { time: "11AM", yes: 71, no: 29 },
      { time: "12PM", yes: 71, no: 29 },
      { time: "1PM", yes: 72, no: 28 },
      { time: "2PM", yes: 71, no: 29 },
    ],
    tags: ["work-life balance", "labor reform", "economy"],
    expiresIn: "5d 3h",
  },
  {
    id: "e3",
    title: "Should crypto gains be taxed as regular income?",
    summary: "Should Bitcoin, Ethereum, and NFT profits be taxed at the same rate as ordinary income rather than capital gains rates?",
    category: "Finance & Tax",
    country: "United States",
    flag: "🇺🇸",
    lang: "en",
    yesVotes: 48000,
    noVotes: 102000,
    totalVoters: 150000,
    trend: [
      { time: "9AM", yes: 38, no: 62 },
      { time: "10AM", yes: 35, no: 65 },
      { time: "11AM", yes: 33, no: 67 },
      { time: "12PM", yes: 32, no: 68 },
      { time: "1PM", yes: 32, no: 68 },
      { time: "2PM", yes: 32, no: 68 },
    ],
    tags: ["crypto", "tax", "investment"],
    expiresIn: "1d 7h",
  },
  {
    id: "e4",
    title: "Should nuclear power plants get 10-year life extensions?",
    summary: "Should aging nuclear power plants be granted 10-year operational extensions as a bridge to renewable energy targets?",
    category: "Energy & Climate",
    country: "United Kingdom",
    flag: "🇬🇧",
    lang: "en",
    yesVotes: 91000,
    noVotes: 109000,
    totalVoters: 200000,
    trend: [
      { time: "9AM", yes: 48, no: 52 },
      { time: "10AM", yes: 46, no: 54 },
      { time: "11AM", yes: 45, no: 55 },
      { time: "12PM", yes: 45, no: 55 },
      { time: "1PM", yes: 45, no: 55 },
      { time: "2PM", yes: 45, no: 55 },
    ],
    tags: ["nuclear", "climate", "energy policy"],
    expiresIn: "3d 20h",
  },
  {
    id: "k1",
    title: "AI 생성 콘텐츠 라벨 의무화",
    summary: "AI가 생성한 이미지·텍스트에 워터마크 또는 라벨 표시를 법적으로 의무화해야 하는가?",
    category: "기술·AI",
    country: "대한민국",
    flag: "🇰🇷",
    lang: "ko",
    yesVotes: 61240,
    noVotes: 28760,
    totalVoters: 90000,
    trend: [
      { time: "09:00", yes: 52, no: 48 },
      { time: "10:00", yes: 55, no: 45 },
      { time: "11:00", yes: 58, no: 42 },
      { time: "12:00", yes: 62, no: 38 },
      { time: "13:00", yes: 63, no: 37 },
      { time: "14:00", yes: 68, no: 32 },
    ],
    tags: ["AI규제", "표현의자유", "디지털권리"],
    expiresIn: "2일 14시간",
  },
  {
    id: "k2",
    title: "주 4일 근무제 도입",
    summary: "기업들이 생산성 저하 없이 주 4일 근무제를 의무적으로 시범 도입해야 하는가?",
    category: "노동·경제",
    country: "대한민국",
    flag: "🇰🇷",
    lang: "ko",
    yesVotes: 74100,
    noVotes: 25900,
    totalVoters: 100000,
    trend: [
      { time: "09:00", yes: 68, no: 32 },
      { time: "10:00", yes: 70, no: 30 },
      { time: "11:00", yes: 72, no: 28 },
      { time: "12:00", yes: 73, no: 27 },
      { time: "13:00", yes: 74, no: 26 },
      { time: "14:00", yes: 74, no: 26 },
    ],
    tags: ["노동개혁", "워라밸", "경제정책"],
    expiresIn: "5일 3시간",
  },
];

export const MOCK_SBTS: SBT[] = [
  {
    id: "sbt-1",
    name: "First Vote",
    description: "Cast your very first vote",
    icon: "🗳️",
    color: "from-blue-500 to-indigo-600",
    earnedAt: "2025.04.10",
    rarity: "common",
  },
  {
    id: "sbt-2",
    name: "Verified Human",
    description: "1-person-1-vote KYC confirmed",
    icon: "✅",
    color: "from-green-500 to-emerald-600",
    earnedAt: "2025.04.10",
    rarity: "rare",
  },
  {
    id: "sbt-3",
    name: "7-Day Streak",
    description: "Voted every day for a week",
    icon: "🔥",
    color: "from-orange-500 to-red-600",
    earnedAt: "2025.04.17",
    rarity: "rare",
  },
  {
    id: "sbt-4",
    name: "Early Voter",
    description: "Voted within 1 hour of issue launch × 10",
    icon: "⚡",
    color: "from-yellow-400 to-amber-500",
    earnedAt: "2025.04.15",
    rarity: "epic",
  },
  {
    id: "sbt-5",
    name: "AI Issue Expert",
    description: "Participated in all AI category issues",
    icon: "🤖",
    color: "from-purple-500 to-violet-600",
    earnedAt: "2025.04.16",
    rarity: "epic",
  },
  {
    id: "sbt-6",
    name: "Democracy Guardian",
    description: "Reached 100+ total votes",
    icon: "🏛️",
    color: "from-pink-500 to-rose-600",
    earnedAt: "2025.04.17",
    rarity: "legendary",
  },
];

export const RARITY_COLORS = {
  common: "text-slate-400 border-slate-600",
  rare: "text-blue-400 border-blue-600",
  epic: "text-purple-400 border-purple-600",
  legendary: "text-yellow-400 border-yellow-500",
};

export const MOCK_USER = {
  address: "0x71C...9Fe2",
  balance: 1284.5,
  pendingRewards: 42.0,
  totalVotes: 127,
  rank: "Diamond",
  rankIcon: "💎",
};
