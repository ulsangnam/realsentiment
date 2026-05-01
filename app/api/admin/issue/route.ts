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
import { getIssuePDA, PROGRAM_ID } from "@/lib/solana";
import { supabase } from "@/lib/supabase";

// --- Solana setup (mirrors the pattern in lib/solana.ts) ---

const CONNECTION = new Connection(clusterApiUrl("devnet"), "confirmed");

/**
 * Decodes the fee payer keypair from the base58-encoded env var.
 * Matches the same pattern used in app/api/vote/route.ts.
 */
function getFeePayerKeypair(): Keypair {
  const secret = process.env.SOLANA_FEE_PAYER_SECRET;
  if (!secret) throw new Error("SOLANA_FEE_PAYER_SECRET not set");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const bs58 = require("bs58") as { decode: (s: string) => Uint8Array };
  return Keypair.fromSecretKey(bs58.decode(secret.trim()));
}

/**
 * Validates the x-admin-secret header against ADMIN_SECRET env var.
 * Returns true if the secret matches, false otherwise.
 *
 * @param req - Incoming Next.js request
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  return !!secret && secret === process.env.ADMIN_SECRET;
}

// --- Request body type ---

interface CreateIssueBody {
  id: string;
  title: string;
  summary: string;
  category: string;
  lang: "en" | "ko";
  leaning: number;
  expires_at: string; // ISO datetime string
}

// --- Handlers ---

/**
 * GET /api/admin/issue
 * Returns all issues from Supabase, newest first.
 * Requires x-admin-secret header.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("issues")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ issues: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/issue
 * Creates an issue in Supabase and on-chain via the create_issue Anchor instruction.
 * Requires x-admin-secret header.
 *
 * Body: { id, title, summary, category, lang, leaning, expires_at }
 * Returns: { ok: true, signature }
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CreateIssueBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { id, title, summary, category, lang, leaning, expires_at } = body;

  // Validate required fields
  if (!id || !title || !summary || !category || !lang || !expires_at) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  // --- Supabase insert ---
  const { error: dbError } = await supabase.from("issues").insert({
    id,
    title,
    summary,
    category,
    lang,
    leaning: Number(leaning),
    expires_at,
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // --- On-chain create_issue transaction ---
  try {
    const feePayer = getFeePayerKeypair();
    const issuePDA = getIssuePDA(id);

    // Build a read-only wallet shim — the fee payer signs after instruction building
    const walletShim = {
      publicKey: feePayer.publicKey,
      signTransaction: async <T>(tx: T) => tx,
      signAllTransactions: async <T>(txs: T[]) => txs,
    };

    const provider = new AnchorProvider(CONNECTION, walletShim, { commitment: "confirmed" });
    const program = new Program(IDL as never, provider);

    // expires_at is an ISO string → convert to Unix timestamp (seconds)
    const expiresAtUnix = Math.floor(new Date(expires_at).getTime() / 1000);

    // Build the create_issue instruction using the Anchor program methods
    const ix = await (
      program.methods as never as {
        createIssue: (
          issueId: string,
          title: string,
          category: string,
          expiresAt: BN,
          leaning: number
        ) => {
          accounts: (a: object) => { instruction: () => Promise<unknown> };
        };
      }
    )
      .createIssue(id, title, category, new BN(expiresAtUnix), Number(leaning))
      .accounts({
        issue: issuePDA,
        authority: feePayer.publicKey,
      })
      .instruction();

    // Build VersionedTransaction using MessageV0 (same pattern as buildVoteTransaction in lib/solana.ts)
    const { blockhash } = await CONNECTION.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: feePayer.publicKey,
      recentBlockhash: blockhash,
      instructions: [ix as never],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);

    // Fee payer signs and sends — no user wallet needed for admin operations
    tx.sign([feePayer]);

    const signature = await CONNECTION.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await CONNECTION.confirmTransaction(signature, "confirmed");

    return NextResponse.json({ ok: true, signature });
  } catch (err) {
    // On-chain failed — roll back the Supabase row to keep state consistent
    await supabase.from("issues").delete().eq("id", id);

    const msg = err instanceof Error ? err.message : String(err);
    console.error("admin/issue POST on-chain error:", msg);
    return NextResponse.json({ error: `on-chain failed: ${msg}` }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/issue?id=xxx
 * Deletes an issue from Supabase only.
 * On-chain accounts cannot be easily closed, so no on-chain operation is performed.
 * Requires x-admin-secret header.
 */
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "missing id query param" }, { status: 400 });
  }

  const { error } = await supabase.from("issues").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
