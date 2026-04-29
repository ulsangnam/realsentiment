const { readFileSync } = require("fs");
const { homedir } = require("os");
const { join } = require("path");
const { Connection, Keypair, clusterApiUrl, PublicKey } = require("@solana/web3.js");
const anchor = require("@coral-xyz/anchor");

const IDL_PATH = join(__dirname, "../lib/idl.json");
const KEYPAIR_PATH = join(homedir(), ".config/solana/id.json");

async function main() {
  const idl = JSON.parse(readFileSync(IDL_PATH, "utf8"));
  const secret = JSON.parse(readFileSync(KEYPAIR_PATH, "utf8"));
  const admin = Keypair.fromSecretKey(new Uint8Array(secret));

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const wallet = new anchor.Wallet(admin);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new anchor.Program(idl, provider);

  // 30 days from now
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

  const issues = [
    { id: "e1", title: "AI-generated content mandatory labeling", category: "Tech & AI",       leaning:  0 },
    { id: "e2", title: "US 4-day work week legislation",           category: "Labor & Economy", leaning: -1 },
    { id: "e3", title: "Crypto gains taxed as regular income",     category: "Finance & Tax",   leaning: -1 },
    { id: "e4", title: "Nuclear plant 10-year life extensions",    category: "Energy & Climate", leaning:  1 },
    { id: "k1", title: "AI 생성 콘텐츠 라벨 의무화",              category: "기술·AI",          leaning:  0 },
    { id: "k2", title: "주 4일 근무제 법제화",                    category: "노동·경제",         leaning: -1 },
  ];

  for (const issue of issues) {
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("issue"), Buffer.from(issue.id)],
        program.programId
      );

      const existing = await connection.getAccountInfo(pda);
      if (existing) {
        console.log(`⏭  ${issue.id} 이미 존재 (${pda.toBase58().slice(0, 8)}...)`);
        continue;
      }

      const tx = await program.methods
        .createIssue(issue.id, issue.title, issue.category, new anchor.BN(expiresAt), issue.leaning)
        .accounts({ issue: pda, creator: admin.publicKey })
        .rpc();

      console.log(`✅ ${issue.id} 등록 완료`);
      console.log(`   PDA: ${pda.toBase58()}`);
      console.log(`   TX : https://solscan.io/tx/${tx}?cluster=devnet`);
    } catch (e) {
      console.error(`❌ ${issue.id} 실패:`, e.message ?? e);
    }
  }

  console.log("\n완료.");
}

main().catch(console.error);
