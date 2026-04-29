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

  const politicians = [
    { id: "yoon-sy",  name: "윤석열", party: "국민의힘",    role: "전 대통령", leaning: 1  },
    { id: "moon-ji",  name: "문재인", party: "더불어민주당", role: "전 대통령", leaning: -1 },
    { id: "lee-jm",   name: "이재명", party: "더불어민주당", role: "대표",      leaning: -1 },
    { id: "cho-guk",  name: "조국",   party: "조국혁신당",   role: "대표",      leaning: -1 },
  ];

  for (const p of politicians) {
    try {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("politician"), Buffer.from(p.id)],
        program.programId
      );

      const existing = await connection.getAccountInfo(pda);
      if (existing) {
        console.log(`⏭  ${p.name} 이미 등록됨 (${pda.toBase58().slice(0, 8)}...)`);
        continue;
      }

      const tx = await program.methods
        .createPolitician(p.id, p.name, p.party, p.role, p.leaning)
        .accounts({ politician: pda, creator: admin.publicKey })
        .rpc();

      console.log(`✅ ${p.name} 등록 완료`);
      console.log(`   PDA: ${pda.toBase58()}`);
      console.log(`   TX : https://solscan.io/tx/${tx}?cluster=devnet`);
    } catch (e) {
      console.error(`❌ ${p.name} 실패:`, e.message ?? e);
    }
  }

  console.log("\n완료.");
}

main().catch(console.error);
