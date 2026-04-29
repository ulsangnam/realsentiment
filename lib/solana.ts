import {
  Connection,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  SystemProgram,
  clusterApiUrl,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
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

// Minimum lamports to cover vote_record account rent (~1.49M) plus buffer
const RENT_BUFFER_LAMPORTS = 3_000_000; // 0.003 SOL

export async function buildVoteTransaction(
  voterAddress: string,
  issueId: string,
  score: number,
  feePayerAddress?: string
): Promise<VersionedTransaction> {
  const voter = new PublicKey(voterAddress);
  const feePayer = feePayerAddress ? new PublicKey(feePayerAddress) : voter;
  const issuePDA = getIssuePDA(issueId);
  const votePDA = getVotePDA(voter, issueId);

  const provider = new AnchorProvider(
    CONNECTION,
    { publicKey: voter, signTransaction: async (tx) => tx, signAllTransactions: async (txs) => txs },
    { commitment: "confirmed" }
  );
  const program = new Program(IDL as never, provider);

  const voteIx = await (program.methods as never as {
    castVote: (issueId: string, score: number) => {
      accounts: (a: object) => { instruction: () => Promise<unknown> }
    }
  }).castVote(issueId, score)
    .accounts({ issue: issuePDA, voteRecord: votePDA, voter })
    .instruction();

  const instructions = [];

  // If fee payer is sponsoring, prepend a SOL transfer to cover vote_record rent
  if (feePayerAddress && feePayer.toBase58() !== voter.toBase58()) {
    const voterBalance = await CONNECTION.getBalance(voter);
    if (voterBalance < RENT_BUFFER_LAMPORTS) {
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: feePayer,
          toPubkey: voter,
          lamports: RENT_BUFFER_LAMPORTS,
        })
      );
    }
  }

  instructions.push(voteIx as never);

  const { blockhash } = await CONNECTION.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  return new VersionedTransaction(message);
}
