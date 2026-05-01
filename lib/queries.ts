import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import IDL from "./idl.json";
import { getIssuePDA, getVotePDA, PROGRAM_ID } from "./solana";

const CONNECTION = new Connection(clusterApiUrl("devnet"), "confirmed");

function getProgram() {
  const provider = new AnchorProvider(
    CONNECTION,
    {
      publicKey: PublicKey.default,
      signTransaction: async (tx) => tx,
      signAllTransactions: async (txs) => txs,
    },
    { commitment: "confirmed" }
  );
  return new Program(IDL as never, provider);
}

function bnToNum(v: unknown): number {
  if (v instanceof BN) return v.toNumber();
  if (typeof v === "bigint") return Number(v);
  return Number(v);
}

// ── Issue ─────────────────────────────────────────────

export interface OnChainIssue {
  issueId: string;
  title: string;
  category: string;
  leaning: number;
  scores: [number, number, number, number, number];
  voteCount: number;
  avgScore: number;
  expiresAt: number;
}

export interface VoterHistory {
  issueId: string;
  score: number;
  votedAt: number;
  issueTitle?: string;
  issueCategory?: string;
  issueLeaning?: number;
}

export async function fetchIssue(issueId: string): Promise<OnChainIssue | null> {
  try {
    const program = getProgram();
    const pda = getIssuePDA(issueId);
    const account = await (program.account as never as {
      issueAccount: { fetch: (pda: PublicKey) => Promise<Record<string, unknown>> }
    }).issueAccount.fetch(pda);

    const scores: [number, number, number, number, number] = [
      bnToNum(account.score1),
      bnToNum(account.score2),
      bnToNum(account.score3),
      bnToNum(account.score4),
      bnToNum(account.score5),
    ];
    const voteCount = bnToNum(account.voteCount);
    const weightedSum = scores.reduce((acc, cnt, i) => acc + cnt * (i + 1), 0);

    return {
      issueId: account.issueId as string,
      title: account.title as string,
      category: account.category as string,
      leaning: account.leaning as number,
      scores,
      voteCount,
      avgScore: voteCount > 0 ? weightedSum / voteCount : 0,
      expiresAt: bnToNum(account.expiresAt),
    };
  } catch {
    return null;
  }
}

export async function fetchVoterHistory(walletAddress: string): Promise<VoterHistory[]> {
  try {
    const voter = new PublicKey(walletAddress);
    const accounts = await CONNECTION.getProgramAccounts(PROGRAM_ID, {
      filters: [
        { dataSize: 86 }, // VoteRecord::LEN
        { memcmp: { offset: 8, bytes: voter.toBase58() } },
      ],
    });

    const records: VoterHistory[] = accounts.map((acc) => {
      const data = Buffer.from(acc.account.data);
      const idLen = data.readUInt32LE(40);
      const issueId = data.slice(44, 44 + idLen).toString("utf8");
      const score = data[44 + idLen];
      const votedAt = Number(data.readBigInt64LE(44 + idLen + 1));
      return { issueId, score, votedAt };
    });

    const enriched = await Promise.all(
      records.map(async (r) => {
        const issue = await fetchIssue(r.issueId).catch(() => null);
        return { ...r, issueTitle: issue?.title, issueCategory: issue?.category, issueLeaning: issue?.leaning };
      })
    );

    return enriched.sort((a, b) => b.votedAt - a.votedAt);
  } catch {
    return [];
  }
}

// Returns the score (1-5) if voter already voted on this issue, else null.
// Retries up to 3x with 400ms backoff — devnet RPC transiently returns null.
export async function fetchIssueVoteRecord(voterAddress: string, issueId: string): Promise<number | null> {
  const voter = new PublicKey(voterAddress);
  const pda = getVotePDA(voter, issueId);
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const info = await CONNECTION.getAccountInfo(pda, "confirmed");
      if (!info) {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
        continue;
      }
      const data = Buffer.from(info.data);
      const idLen = data.readUInt32LE(40);
      const score = data[44 + idLen];
      return score >= 1 && score <= 5 ? score : null;
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
    }
  }
  return null;
}

export function computePoliticalLeaning(history: VoterHistory[]): {
  label: string;
  score: number; // -100(강진보) ~ +100(강보수)
} {
  const weighted = history
    .filter((h) => h.issueLeaning !== undefined && h.issueLeaning !== 0)
    .map((h) => (h.score - 3) * (h.issueLeaning ?? 0));

  if (weighted.length === 0) return { label: "중립", score: 0 };

  const avg = weighted.reduce((a, b) => a + b, 0) / weighted.length;
  const score = Math.round((avg / 8) * 100);
  const label =
    score >= 50 ? "강보수" : score >= 20 ? "보수" :
    score >= -19 ? "중도" : score >= -49 ? "진보" : "강진보";

  return { label, score };
}

// ── Politician ────────────────────────────────────────

export interface OnChainPolitician {
  politicianId: string;
  name: string;
  party: string;
  role: string;
  leaning: number; // -1=진보, 0=중립, 1=보수
  scores: [number, number, number, number, number];
  voteCount: number;
  avgScore: number; // 1.00~5.00 지지도
  approvalRate: number; // 4+5점 비율 (%)
}

export interface PoliticianStance {
  politicianId: string;
  issueId: string;
  stance: number; // -1=반대, 0=중립, 1=찬성
}

export function getPoliticianPDA(politicianId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("politician"), Buffer.from(politicianId)],
    PROGRAM_ID
  );
  return pda;
}

export function getPoliticianVotePDA(voter: PublicKey, politicianId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pvote"), voter.toBuffer(), Buffer.from(politicianId)],
    PROGRAM_ID
  );
  return pda;
}

export function getStancePDA(politicianId: string, issueId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("stance"), Buffer.from(politicianId), Buffer.from(issueId)],
    PROGRAM_ID
  );
  return pda;
}

function parsePoliticianAccount(account: Record<string, unknown>): OnChainPolitician {
  const scores: [number, number, number, number, number] = [
    bnToNum(account.score1),
    bnToNum(account.score2),
    bnToNum(account.score3),
    bnToNum(account.score4),
    bnToNum(account.score5),
  ];
  const voteCount = bnToNum(account.voteCount);
  const weightedSum = scores.reduce((acc, cnt, i) => acc + cnt * (i + 1), 0);
  const supportCount = scores[3] + scores[4]; // score 4+5

  return {
    politicianId: account.politicianId as string,
    name: account.name as string,
    party: account.party as string,
    role: account.role as string,
    leaning: account.leaning as number,
    scores,
    voteCount,
    avgScore: voteCount > 0 ? weightedSum / voteCount : 0,
    approvalRate: voteCount > 0 ? Math.round((supportCount / voteCount) * 100) : 0,
  };
}

export async function fetchPolitician(politicianId: string): Promise<OnChainPolitician | null> {
  try {
    const program = getProgram();
    const pda = getPoliticianPDA(politicianId);
    const account = await (program.account as never as {
      politicianAccount: { fetch: (pda: PublicKey) => Promise<Record<string, unknown>> }
    }).politicianAccount.fetch(pda);
    return parsePoliticianAccount(account);
  } catch {
    return null;
  }
}

// 모든 정치인 계정 가져오기 (PoliticianAccount discriminator 필터)
export async function fetchAllPoliticians(): Promise<OnChainPolitician[]> {
  try {
    const program = getProgram();
    const accounts = await (program.account as never as {
      politicianAccount: { all: () => Promise<{ account: Record<string, unknown> }[]> }
    }).politicianAccount.all();

    return accounts
      .map((a) => parsePoliticianAccount(a.account))
      .sort((a, b) => b.approvalRate - a.approvalRate); // 지지율 높은 순
  } catch {
    return [];
  }
}

// 정치인의 안건별 입장 목록
export async function fetchPoliticianStances(politicianId: string, issueIds: string[]): Promise<PoliticianStance[]> {
  const results: PoliticianStance[] = [];
  await Promise.all(
    issueIds.map(async (issueId) => {
      try {
        const program = getProgram();
        const pda = getStancePDA(politicianId, issueId);
        const account = await (program.account as never as {
          politicianStance: { fetch: (pda: PublicKey) => Promise<Record<string, unknown>> }
        }).politicianStance.fetch(pda);
        results.push({
          politicianId: account.politicianId as string,
          issueId: account.issueId as string,
          stance: account.stance as number,
        });
      } catch {
        // 입장 미등록 이슈는 skip
      }
    })
  );
  return results;
}

// 이 노드가 특정 정치인에게 투표했는지 확인
export async function fetchPoliticianVoteRecord(
  walletAddress: string,
  politicianId: string
): Promise<number | null> {
  try {
    const voter = new PublicKey(walletAddress);
    const pda = getPoliticianVotePDA(voter, politicianId);
    const info = await CONNECTION.getAccountInfo(pda);
    if (!info) return null;
    // PoliticianVoteRecord::LEN=86, score at offset: 8+32+(4+len)+score
    // politician_id len at offset 40
    const data = info.data;
    const idLen = data.readUInt32LE(40);
    return data[44 + idLen]; // score
  } catch {
    return null;
  }
}
