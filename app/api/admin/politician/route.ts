import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  clusterApiUrl,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import IDL from "@/lib/idl.json";
import { PROGRAM_ID } from "@/lib/solana";
import { getPoliticianPDA } from "@/lib/queries";
import { supabase } from "@/lib/supabase";

// --- Solana setup (same pattern as issue route and vote route) ---

const CONNECTION = new Connection(clusterApiUrl("devnet"), "confirmed");

/**
 * Decodes the fee payer keypair from the base58-encoded env var.
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
 *
 * @param req - Incoming Next.js request
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-admin-secret");
  return !!secret && secret === process.env.ADMIN_SECRET;
}

// Suppress unused import warning — PROGRAM_ID is used implicitly via getPoliticianPDA
void PROGRAM_ID;

// --- Request body type ---

interface CreatePoliticianBody {
  id: string;
  name: string;
  party: string;
  role: string;
  country: string;
  lang: "en" | "ko";
  leaning: number; // -1=진보, 0=중립, 1=보수
  photo_url?: string;
  bio?: string;
}

// --- Handlers ---

/**
 * GET /api/admin/politician
 * Returns all politicians from Supabase.
 * Requires x-admin-secret header.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("politicians")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ politicians: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/admin/politician
 * Creates a politician in Supabase and on-chain via create_politician Anchor instruction.
 * Requires x-admin-secret header.
 *
 * Body: { id, name, party, role, country, lang, leaning, photo_url?, bio? }
 * Returns: { ok: true, signature }
 */
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: CreatePoliticianBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { id, name, party, role, country, lang, leaning, photo_url, bio } = body;

  // Validate required fields
  if (!id || !name || !party || !role || !country || !lang) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  // --- Supabase insert ---
  const { error: dbError } = await supabase.from("politicians").insert({
    id,
    name,
    party,
    role,
    country,
    lang,
    leaning: Number(leaning),
    photo_url: photo_url || null,
    bio: bio || null,
  });

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  // --- On-chain create_politician transaction ---
  try {
    const feePayer = getFeePayerKeypair();
    const politicianPDA = getPoliticianPDA(id);

    // Wallet shim — fee payer will sign after instruction building
    const walletShim = {
      publicKey: feePayer.publicKey,
      signTransaction: async <T>(tx: T) => tx,
      signAllTransactions: async <T>(txs: T[]) => txs,
    };

    const provider = new AnchorProvider(CONNECTION, walletShim, { commitment: "confirmed" });
    const program = new Program(IDL as never, provider);

    // Build the create_politician instruction
    const ix = await (
      program.methods as never as {
        createPolitician: (
          politicianId: string,
          name: string,
          party: string,
          role: string,
          leaning: number
        ) => {
          accounts: (a: object) => { instruction: () => Promise<unknown> };
        };
      }
    )
      .createPolitician(id, name, party, role, Number(leaning))
      .accounts({
        politician: politicianPDA,
        authority: feePayer.publicKey,
      })
      .instruction();

    // Build VersionedTransaction using MessageV0 (same pattern as lib/solana.ts buildVoteTransaction)
    const { blockhash } = await CONNECTION.getLatestBlockhash();
    const message = new TransactionMessage({
      payerKey: feePayer.publicKey,
      recentBlockhash: blockhash,
      instructions: [ix as never],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);

    // Fee payer signs — no user wallet required for admin ops
    tx.sign([feePayer]);

    const signature = await CONNECTION.sendRawTransaction(tx.serialize(), {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await CONNECTION.confirmTransaction(signature, "confirmed");

    return NextResponse.json({ ok: true, signature });
  } catch (err) {
    // Roll back the Supabase row if the on-chain operation fails
    await supabase.from("politicians").delete().eq("id", id);

    const msg = err instanceof Error ? err.message : String(err);
    console.error("admin/politician POST on-chain error:", msg);
    return NextResponse.json({ error: `on-chain failed: ${msg}` }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/politician?id=xxx
 * Deletes a politician from Supabase only.
 * On-chain accounts are not closed (not easily reversible on Solana).
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

  const { error } = await supabase.from("politicians").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
