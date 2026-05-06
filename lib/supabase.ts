import { createClient } from "@supabase/supabase-js";

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey);

export type DbPolitician = {
  id: string;
  name: string;
  party: string;
  role: string;
  country: string;
  lang: "en" | "ko";
  leaning: number;
  photo_url: string | null;
  bio: string | null;
};

export type DbIssue = {
  id: string;
  title: string;
  summary: string;
  category: string;
  lang: "en" | "ko";
  leaning: number;
  expires_at: string;
  // --- Crawl fields (optional — only present on crawled issues) ---
  source_url?: string | null;
  related_issue_ids?: string[] | null;
  crawled_at?: string | null;
};
