"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Vote, Trophy, Home } from "lucide-react";

const links = [
  { href: "/", icon: Home, label: "홈" },
  { href: "/vote", icon: Vote, label: "투표" },
  { href: "/rewards", icon: Trophy, label: "보상" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--card-border)] bg-[var(--card)]/90 backdrop-blur-xl">
      <div className="flex items-center justify-around max-w-lg mx-auto px-4 py-3">
        {links.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-5 py-1 rounded-xl transition-all duration-200 ${
                active
                  ? "text-indigo-400"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-xs font-medium ${active ? "text-indigo-400" : ""}`}>
                {label}
              </span>
              {active && (
                <span className="w-1 h-1 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
