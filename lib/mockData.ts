export type Issue = {
  id: string;
  title: string;
  summary: string;
  category: string;
  country: string;
  flag: string;
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
    id: "1",
    title: "AI 생성 콘텐츠 라벨 의무화",
    summary: "AI가 생성한 이미지·텍스트에 워터마크 또는 라벨 표시를 법적으로 의무화해야 하는가?",
    category: "기술·AI",
    country: "대한민국",
    flag: "🇰🇷",
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
    id: "2",
    title: "주 4일 근무제 도입",
    summary: "기업들이 생산성 저하 없이 주 4일 근무제를 의무적으로 시범 도입해야 하는가?",
    category: "노동·경제",
    country: "대한민국",
    flag: "🇰🇷",
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
  {
    id: "3",
    title: "가상자산 양도소득세 과세",
    summary: "코인·NFT 등 가상자산 차익에 대해 20% 양도소득세를 부과해야 하는가?",
    category: "금융·세금",
    country: "대한민국",
    flag: "🇰🇷",
    yesVotes: 31500,
    noVotes: 68500,
    totalVoters: 100000,
    trend: [
      { time: "09:00", yes: 40, no: 60 },
      { time: "10:00", yes: 37, no: 63 },
      { time: "11:00", yes: 35, no: 65 },
      { time: "12:00", yes: 33, no: 67 },
      { time: "13:00", yes: 32, no: 68 },
      { time: "14:00", yes: 32, no: 68 },
    ],
    tags: ["크립토", "세금", "투자"],
    expiresIn: "1일 7시간",
  },
  {
    id: "4",
    title: "원전 수명 연장 찬반",
    summary: "노후 원자력발전소의 설계 수명을 10년 추가 연장하는 정책을 지지하는가?",
    category: "에너지·환경",
    country: "대한민국",
    flag: "🇰🇷",
    yesVotes: 44200,
    noVotes: 55800,
    totalVoters: 100000,
    trend: [
      { time: "09:00", yes: 48, no: 52 },
      { time: "10:00", yes: 46, no: 54 },
      { time: "11:00", yes: 45, no: 55 },
      { time: "12:00", yes: 44, no: 56 },
      { time: "13:00", yes: 44, no: 56 },
      { time: "14:00", yes: 44, no: 56 },
    ],
    tags: ["에너지정책", "탈원전", "기후변화"],
    expiresIn: "3일 20시간",
  },
];

export const MOCK_SBTS: SBT[] = [
  {
    id: "sbt-1",
    name: "첫 투표자",
    description: "첫 번째 투표 참여 기념",
    icon: "🗳️",
    color: "from-blue-500 to-indigo-600",
    earnedAt: "2025.04.10",
    rarity: "common",
  },
  {
    id: "sbt-2",
    name: "신원 인증 완료",
    description: "KYC 인증을 통한 1인 1표 확인",
    icon: "✅",
    color: "from-green-500 to-emerald-600",
    earnedAt: "2025.04.10",
    rarity: "rare",
  },
  {
    id: "sbt-3",
    name: "7일 연속 참여",
    description: "일주일 동안 매일 투표 참여",
    icon: "🔥",
    color: "from-orange-500 to-red-600",
    earnedAt: "2025.04.17",
    rarity: "rare",
  },
  {
    id: "sbt-4",
    name: "여론 선구자",
    description: "발표 후 1시간 내 투표 10회 이상",
    icon: "⚡",
    color: "from-yellow-400 to-amber-500",
    earnedAt: "2025.04.15",
    rarity: "epic",
  },
  {
    id: "sbt-5",
    name: "AI 이슈 전문가",
    description: "AI 카테고리 안건 전체 참여",
    icon: "🤖",
    color: "from-purple-500 to-violet-600",
    earnedAt: "2025.04.16",
    rarity: "epic",
  },
  {
    id: "sbt-6",
    name: "민주주의 수호자",
    description: "100회 이상 투표 참여 달성",
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
