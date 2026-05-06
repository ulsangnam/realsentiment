/**
 * /api/crawl — Google News RSS auto-crawl + Claude AI processing + Supabase/Solana issue creation.
 *
 * Auth:
 *   - Vercel Cron: Authorization: Bearer {CRON_SECRET}
 *   - Manual trigger: x-admin-secret header
 *
 * Env vars required:
 *   CRON_SECRET, ADMIN_SECRET, ANTHROPIC_API_KEY,
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   SOLANA_FEE_PAYER_SECRET
 */

import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  clusterApiUrl,
} from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import IDL from "@/lib/idl.json";
import { getIssuePDA } from "@/lib/solana";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RssItem {
  title: string;
  link: string;
  description: string;
}

interface RssSource {
  url: string;
  lang: "en" | "ko";
}

interface ClaudeResult {
  title: string;
  summary: string;
  category: string;
  leaning: number;
  related_issue_ids: string[];
  skip: boolean;
  skip_reason: string;
}

// ─── RSS Sources ──────────────────────────────────────────────────────────────

const RSS_SOURCES: RssSource[] = [
  { url: "https://news.google.com/rss/search?q=politics+international+policy&hl=en&gl=US&ceid=US:en", lang: "en" },
  { url: "https://news.google.com/rss/search?q=economy+global&hl=en&gl=US&ceid=US:en", lang: "en" },
  { url: "https://news.google.com/rss/search?q=정치+정책+국제&hl=ko&gl=KR&ceid=KR:ko", lang: "ko" },
  { url: "https://news.google.com/rss/search?q=경제+사회+환경&hl=ko&gl=KR&ceid=KR:ko", lang: "ko" },
];

// Max items to process per RSS source (rate-limit safety)
const MAX_PER_SOURCE = 5;

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Returns true if the request carries a valid cron or admin auth token.
 *
 * @param req - Incoming Next.js request
 */
function isAuthorized(req: NextRequest): boolean {
  // Vercel Cron sends: Authorization: Bearer {CRON_SECRET}
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;
  // Manual trigger uses x-admin-secret
  const adminSecret = req.headers.get("x-admin-secret");
  if (adminSecret && adminSecret === process.env.ADMIN_SECRET) return true;
  return false;
}

// ─── RSS Parsing ──────────────────────────────────────────────────────────────

/**
 * Strips CDATA wrappers and HTML tags from a raw RSS string value.
 * Google News wraps content in <![CDATA[...]]> blocks.
 *
 * @param raw - Raw text possibly containing CDATA and HTML
 */
function cleanText(raw: string): string {
  // Remove CDATA wrapper
  let cleaned = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  // Strip HTML tags (Google news includes <a> in descriptions)
  cleaned = cleaned.replace(/<[^>]+>/g, " ");
  // Collapse whitespace
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Fetches an RSS feed URL and parses up to `limit` items using regex.
 * No external XML parser — pure regex to keep dependencies minimal.
 *
 * @param url   - Google News RSS URL
 * @param limit - Maximum number of items to return
 * @returns Array of { title, link, description }
 */
async function fetchRssItems(url: string, limit: number): Promise<RssItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "VoteX-Crawler/1.0" },
    // Next.js fetch cache: revalidate every 6h to avoid stale results
    next: { revalidate: 21600 },
  });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status} ${url}`);
  const xml = await res.text();

  const items: RssItem[] = [];
  // Match each <item>...</item> block (non-greedy, dotall via workaround)
  const itemPattern = /<item>([\s\S]*?)<\/item>/g;
  let itemMatch: RegExpExecArray | null;

  while ((itemMatch = itemPattern.exec(xml)) !== null && items.length < limit) {
    const block = itemMatch[1];

    // Extract title — handles both plain and CDATA
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/);
    const descMatch = block.match(/<description>([\s\S]*?)<\/description>/);

    const title = titleMatch ? cleanText(titleMatch[1]) : "";
    const link = linkMatch ? cleanText(linkMatch[1]) : "";
    const description = descMatch ? cleanText(descMatch[1]) : "";

    // Skip items with no usable content
    if (title && link) {
      items.push({ title, link, description });
    }
  }

  return items;
}

// ─── Claude AI Processing ─────────────────────────────────────────────────────

/**
 * Builds the Claude prompt for a given language and article.
 * Returns a prompt requesting strictly neutral JSON output.
 *
 * @param lang        - "en" or "ko"
 * @param title       - RSS article title
 * @param description - RSS article description
 * @param existingList - Bullet list of existing issue ids+titles for dedup context
 */
function buildPrompt(lang: "en" | "ko", title: string, description: string, existingList: string): string {
  if (lang === "en") {
    return `Process this news article for a blockchain public opinion poll platform.
Rules: 1) Title & summary must be completely neutral — facts only, no bias. 2) Skip opinion pieces, minor local news, celebrity gossip. 3) Check related existing issues.

Existing issues:
${existingList}

Article title: ${title}
Article description: ${description}

Return ONLY valid JSON:
{
  "title": "neutral issue title under 80 chars",
  "summary": "2-3 neutral factual sentences",
  "category": "one of: Politics, Economy, International, Social, Environment, Technology",
  "leaning": 0,
  "related_issue_ids": [],
  "skip": false,
  "skip_reason": ""
}`;
  }

  // Korean prompt — identical structure, Korean instructions
  return `블록체인 여론조사 플랫폼을 위해 뉴스 기사를 처리하세요.
규칙: 1) 제목과 요약은 완전히 중립적이어야 함 — 사실만, 편향 없음. 2) 의견 기사, 지역 소식, 연예 기사는 건너뜀. 3) 관련 기존 이슈 확인.

기존 이슈:
${existingList}

기사 제목: ${title}
기사 설명: ${description}

유효한 JSON만 반환:
{
  "title": "80자 이하 중립적 이슈 제목",
  "summary": "2-3문장 중립적 사실 요약",
  "category": "다음 중 하나: 정치, 경제, 국제, 사회, 환경, 기술",
  "leaning": 0,
  "related_issue_ids": [],
  "skip": false,
  "skip_reason": ""
}`;
}

/**
 * Calls Claude Haiku via raw fetch (no SDK dependency) to process one article.
 * Returns parsed ClaudeResult or null if the model asks to skip or JSON is invalid.
 *
 * @param lang        - Language of the article
 * @param title       - Article title
 * @param description - Article description
 * @param existingList - Formatted existing issues for context
 */
async function processWithClaude(
  lang: "en" | "ko",
  title: string,
  description: string,
  existingList: string
): Promise<ClaudeResult | null> {
  const prompt = buildPrompt(lang, title, description, existingList);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  const data = await res.json() as { content: { type: string; text: string }[] };
  const text = data.content?.[0]?.text ?? "";

  // Extract JSON block — Claude sometimes wraps in markdown code fences
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    return JSON.parse(jsonMatch[0]) as ClaudeResult;
  } catch {
    return null;
  }
}

// ─── ID Generation ────────────────────────────────────────────────────────────

/**
 * Generates the next sequential issue ID for the given language.
 * Prefix: "ce" for English, "ck" for Korean.
 * Queries Supabase for the current max and increments by 1.
 *
 * @param lang - "en" uses "ce" prefix, "ko" uses "ck" prefix
 */
async function generateNextId(lang: "en" | "ko"): Promise<string> {
  const prefix = lang === "en" ? "ce" : "ck";

  // Fetch all IDs matching the prefix to find the current max
  const { data, error } = await supabase
    .from("issues")
    .select("id")
    .like("id", `${prefix}%`);

  if (error) throw new Error(`ID generation query failed: ${error.message}`);

  let maxNum = 0;
  for (const row of data ?? []) {
    // Parse the numeric suffix after the prefix (e.g., "ce12" → 12)
    const num = parseInt((row.id as string).slice(prefix.length), 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }

  return `${prefix}${maxNum + 1}`;
}

// ─── Solana On-Chain ──────────────────────────────────────────────────────────

const SOLANA_CONNECTION = new Connection(clusterApiUrl("devnet"), "confirmed");

/**
 * Decodes the fee payer keypair from the base58-encoded SOLANA_FEE_PAYER_SECRET env var.
 * Identical to the pattern used in app/api/admin/issue/route.ts.
 */
function getFeePayerKeypair(): Keypair {
  const secret = process.env.SOLANA_FEE_PAYER_SECRET;
  if (!secret) throw new Error("SOLANA_FEE_PAYER_SECRET not set");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bs58 = require("bs58") as { decode: (s: string) => Uint8Array };
  return Keypair.fromSecretKey(bs58.decode(secret.trim()));
}

/**
 * Creates an issue on-chain via the Anchor create_issue instruction.
 * Mirrors the implementation in app/api/admin/issue/route.ts exactly.
 *
 * @param id         - Issue ID (e.g., "ce1")
 * @param title      - Issue title (neutral, under 80 chars)
 * @param category   - Issue category string
 * @param leaning    - Integer leaning value
 * @param expires_at - ISO datetime string for expiry
 * @returns Transaction signature
 */
async function createIssueOnChain(
  id: string,
  title: string,
  category: string,
  leaning: number,
  expires_at: string
): Promise<string> {
  const feePayer = getFeePayerKeypair();
  const issuePDA = getIssuePDA(id);

  // Wallet shim — fee payer signs after instruction is built
  const walletShim = {
    publicKey: feePayer.publicKey,
    signTransaction: async <T>(tx: T) => tx,
    signAllTransactions: async <T>(txs: T[]) => txs,
  };

  const provider = new AnchorProvider(SOLANA_CONNECTION, walletShim, { commitment: "confirmed" });
  const program = new Program(IDL as never, provider);

  // Convert ISO expires_at to Unix timestamp (seconds)
  const expiresAtUnix = Math.floor(new Date(expires_at).getTime() / 1000);

  const ix = await (
    program.methods as never as {
      createIssue: (
        issueId: string,
        title: string,
        category: string,
        expiresAt: BN,
        leaning: number
      ) => { accounts: (a: object) => { instruction: () => Promise<unknown> } };
    }
  )
    .createIssue(id, title, category, new BN(expiresAtUnix), leaning)
    .accounts({ issue: issuePDA, authority: feePayer.publicKey })
    .instruction();

  const { blockhash } = await SOLANA_CONNECTION.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: feePayer.publicKey,
    recentBlockhash: blockhash,
    instructions: [ix as never],
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  tx.sign([feePayer]);

  const signature = await SOLANA_CONNECTION.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await SOLANA_CONNECTION.confirmTransaction(signature, "confirmed");

  return signature;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

/**
 * GET /api/crawl
 * Triggered by Vercel Cron (every 6h) or manual admin call.
 * Crawls RSS → Claude → Supabase + Solana for each qualifying article.
 *
 * Returns: { created, skipped, errors, issues[] }
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;
  const createdIds: string[] = [];

  // Fetch existing issues once to build context for Claude (dedup + related)
  const { data: existingIssues } = await supabase
    .from("issues")
    .select("id, title, lang")
    .order("id", { ascending: false })
    .limit(50);

  // Build per-lang formatted context lists for Claude prompts
  const existingEn = (existingIssues ?? [])
    .filter((i) => i.lang === "en")
    .map((i) => `- ${i.id}: ${i.title}`)
    .join("\n");
  const existingKo = (existingIssues ?? [])
    .filter((i) => i.lang === "ko")
    .map((i) => `- ${i.id}: ${i.title}`)
    .join("\n");

  // Fetch all source_url values already in DB to prevent duplicates
  const { data: existingUrls } = await supabase
    .from("issues")
    .select("source_url")
    .not("source_url", "is", null);
  const seenUrls = new Set((existingUrls ?? []).map((r) => r.source_url as string));

  // 7 days expiry for crawled issues
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Process each RSS source sequentially to avoid rate limits
  for (const source of RSS_SOURCES) {
    let items: RssItem[];
    try {
      items = await fetchRssItems(source.url, MAX_PER_SOURCE);
    } catch (err) {
      console.error("RSS fetch error:", source.url, err);
      errors++;
      continue;
    }

    const existingList = source.lang === "en" ? existingEn : existingKo;

    // Process each article sequentially (Claude rate-limit safety)
    for (const item of items) {
      // Skip if URL already stored
      if (seenUrls.has(item.link)) {
        skipped++;
        continue;
      }

      let result: ClaudeResult | null;
      try {
        result = await processWithClaude(source.lang, item.title, item.description, existingList);
      } catch (err) {
        console.error("Claude error for:", item.title, err);
        errors++;
        continue;
      }

      // Claude said skip, or response was unparseable
      if (!result || result.skip) {
        skipped++;
        continue;
      }

      // Generate next sequential ID for this language
      let issueId: string;
      try {
        issueId = await generateNextId(source.lang);
      } catch (err) {
        console.error("ID generation error:", err);
        errors++;
        continue;
      }

      // --- Supabase INSERT ---
      const { error: dbError } = await supabase.from("issues").insert({
        id: issueId,
        title: result.title,
        summary: result.summary,
        category: result.category,
        lang: source.lang,
        leaning: result.leaning ?? 0,
        expires_at: expiresAt,
        source_url: item.link,
        related_issue_ids: result.related_issue_ids ?? [],
        crawled_at: new Date().toISOString(),
      });

      if (dbError) {
        console.error("Supabase insert error:", dbError.message);
        errors++;
        continue;
      }

      // --- On-chain create_issue (rollback Supabase on failure) ---
      try {
        await createIssueOnChain(issueId, result.title, result.category, result.leaning ?? 0, expiresAt);
      } catch (err) {
        // Rollback the DB row to keep state consistent
        await supabase.from("issues").delete().eq("id", issueId);
        console.error("On-chain error (rolled back):", issueId, err);
        errors++;
        continue;
      }

      // Success — track for response and update seen sets
      seenUrls.add(item.link);
      createdIds.push(issueId);
      created++;
    }
  }

  return NextResponse.json({ created, skipped, errors, issues: createdIds });
}
