import {
  Connection,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
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

// Returns a VersionedTransaction (v0) so Privy can sign it natively.
// feePayer defaults to voter; pass server pubkey for gas sponsorship.
export async function buildVoteTransaction(
  voterAddress: string,
  issueId: string,
  support: boolean,
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

  const ix = await (program.methods as never as {
    castVote: (issueId: string, support: boolean) => {
      accounts: (a: object) => { instruction: () => Promise<unknown> }
    }
  }).castVote(issueId, support)
    .accounts({ issue: issuePDA, voteRecord: votePDA, voter })
    .instruction();

  const { blockhash } = await CONNECTION.getLatestBlockhash();
  const message = new TransactionMessage({
    payerKey: feePayer,
    recentBlockhash: blockhash,
    instructions: [ix as never],
  }).compileToV0Message();

  return new VersionedTransaction(message);
}
