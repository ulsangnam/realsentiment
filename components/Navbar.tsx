"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Vote, Trophy, Home, Landmark } from "lucide-react";
import { useEffect, useState } from "react";

const links = [
  { href: "/", icon: Home, en: "Home", ko: "홈" },
  { href: "/vote", icon: Vote, en: "Vote", ko: "투표" },
  { href: "/politicians", icon: Landmark, en: "Polls", ko: "정치인" },
  { href: "/rewards", icon: Trophy, en: "Rewards", ko: "보상" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [lang, setLang] = useState<"en" | "ko">("en");

  useEffect(() => {
    const stored = localStorage.getItem("rs_lang") as "en" | "ko" | null;
    if (stored) setLang(stored);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "rs_lang" && (e.newValue === "en" || e.newValue === "ko")) {
        setLang(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--card-border)] bg-[var(--card)]/90 backdrop-blur-xl">
      <div className="flex items-center justify-around max-w-lg mx-auto px-4 py-3">
        {links.map(({ href, icon: Icon, en, ko }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-5 py-1 rounded-xl transition-all duration-200 ${
                active ? "text-indigo-400" : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-xs font-medium ${active ? "text-indigo-400" : ""}`}>
                {lang === "en" ? en : ko}
              </span>
              {active && <span className="w-1 h-1 rounded-full bg-indigo-400" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
