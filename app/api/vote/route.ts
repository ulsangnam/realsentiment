import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  Keypair,
  Transaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

const CONNECTION = new Connection(clusterApiUrl("devnet"), "confirmed");

function getFeePayerKeypair(): Keypair {
  const secret = process.env.SOLANA_FEE_PAYER_SECRET;
  if (!secret) throw new Error("SOLANA_FEE_PAYER_SECRET not set");
  const arr = JSON.parse(secret) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

// Auto-refill fee payer if balance is low
async function ensureFeePayerFunded(keypair: Keypair): Promise<void> {
  try {
    const balance = await CONNECTION.getBalance(keypair.publicKey);
    if (balance < 0.05 * LAMPORTS_PER_SOL) {
      const sig = await CONNECTION.requestAirdrop(keypair.publicKey, 2 * LAMPORTS_PER_SOL);
      await CONNECTION.confirmTransaction(sig, "confirmed");
    }
  } catch {
    // Airdrop may fail on rate limit — proceed anyway
  }
}

export async function POST(req: NextRequest) {
  try {
    const { signedTxBase64 } = await req.json();
    if (!signedTxBase64) {
      return NextResponse.json({ error: "missing signedTxBase64" }, { status: 400 });
    }

    const feePayer = getFeePayerKeypair();
    await ensureFeePayerFunded(feePayer);

    const txBytes = Buffer.from(signedTxBase64, "base64");
    const tx = Transaction.from(txBytes);

    tx.partialSign(feePayer);

    const raw = tx.serialize();
    const sig = await CONNECTION.sendRawTransaction(raw, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    await CONNECTION.confirmTransaction(sig, "confirmed");

    return NextResponse.json({ signature: sig });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("vote API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
