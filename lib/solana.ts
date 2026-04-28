import { Connection, PublicKey, Transaction, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import IDL from "./idl.json";

export const PROGRAM_ID = new PublicKey("24DscDehhLv8WamjRUc3Zj3B9hSt8wPeiiLCFX7r1XWy");
export const CONNECTION = new Connection(clusterApiUrl("devnet"), "confirmed");

export function getIssuePDA(issueId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("issue"), Buffer.from(issueId)],
    PROGRAM_ID
  );
  return pda;
}

export function getVotePDA(voter: PublicKey, issueId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), voter.toBuffer(), Buffer.from(issueId)],
    PROGRAM_ID
  );
  return pda;
}

// Builds an unsigned vote transaction — caller is responsible for signing
export async function buildVoteTransaction(
  voterAddress: string,
  issueId: string,
  support: boolean
): Promise<Transaction> {
  const voter = new PublicKey(voterAddress);
  const issuePDA = getIssuePDA(issueId);
  const votePDA = getVotePDA(voter, issueId);

  // Read-only provider (no wallet needed for tx building)
  const provider = new AnchorProvider(
    CONNECTION,
    { publicKey: voter, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs },
    { commitment: "confirmed" }
  );
  const program = new Program(IDL as never, provider);

  const ix = await (program.methods as never as {
    castVote: (issueId: string, support: boolean) => {
      accounts: (a: object) => { instruction: () => Promise<unknown> }
    }
  }).castVote(issueId, support)
    .accounts({ issue: issuePDA, voteRecord: votePDA, voter })
    .instruction();

  const { blockhash } = await CONNECTION.getLatestBlockhash();
  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: voter });
  tx.add(ix as never);
  return tx;
}

// Send a pre-signed transaction (raw bytes)
export async function sendSignedTransaction(signedTxBytes: Uint8Array): Promise<string> {
  const sig = await CONNECTION.sendRawTransaction(signedTxBytes, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await CONNECTION.confirmTransaction(sig, "confirmed");
  return sig;
}
