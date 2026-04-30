/**
 * POST /api/revise-vote
 *
 * Records a vote revision for a given wallet + issue, enforcing a daily limit
 * of one revision per (wallet, issue) pair.
 *
 * Required Supabase table — run this SQL once in your Supabase dashboard:
 *
 * CREATE TABLE vote_revisions (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   voter_address text NOT NULL,
 *   issue_id text NOT NULL,
 *   old_score int NOT NULL,
 *   new_score int NOT NULL,
 *   created_at timestamptz DEFAULT now()
 * );
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { walletAddress, issueId, oldScore, newScore } = await req.json();

  // --- Input Validation ---
  if (!walletAddress || !issueId || !newScore || newScore < 1 || newScore > 5) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  // --- Daily Rate Limit Check ---
  // Compute the start of today in UTC so the window resets at midnight UTC
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("vote_revisions")
    .select("*", { count: "exact", head: true })
    .eq("voter_address", walletAddress)
    .eq("issue_id", issueId)
    .gte("created_at", todayStart.toISOString());

  // If the wallet already revised this issue today, reject with 429 Too Many Requests
  if ((count ?? 0) >= 1) {
    return NextResponse.json({ error: "daily_limit" }, { status: 429 });
  }

  // --- Insert Revision Record ---
  const { error } = await supabase.from("vote_revisions").insert({
    voter_address: walletAddress,
    issue_id: issueId,
    old_score: oldScore,
    new_score: newScore,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
