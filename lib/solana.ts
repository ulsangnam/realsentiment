import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import IDL from "./idl.json";

export const PROGRAM_ID = new PublicKey("24DscDehhLv8WamjRUc3Zj3B9hSt8wPeiiLCFX7r1XWy");
export const CONNECTION = new Connection(clusterApiUrl("devnet"), "confirmed");

export function getProgram(wallet: AnchorWallet) {
  const provider = new AnchorProvider(CONNECTION, wallet, { commitment: "confirmed" });
  return new Program(IDL as never, provider);
}

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

export async function castVoteOnChain(
  wallet: AnchorWallet,
  issueId: string,
  support: boolean
): Promise<string> {
  const program = getProgram(wallet);
  const voter = wallet.publicKey;
  const issuePDA = getIssuePDA(issueId);
  const votePDA = getVotePDA(voter, issueId);

  const tx = await (program.methods as never as {
    castVote: (issueId: string, support: boolean) => {
      accounts: (a: object) => { rpc: () => Promise<string> }
    }
  }).castVote(issueId, support)
    .accounts({
      issue: issuePDA,
      voteRecord: votePDA,
      voter,
    })
    .rpc();

  return tx;
}
