"use client";

import { useState } from "react";
import { IssuesTab, PoliticiansTab, inputStyle } from "./AdminTabs";

/**
 * Admin panel for VoteX — accessible at /admin.
 * Not linked from the Navbar (internal tool).
 *
 * Flow:
 *  1. User enters the admin secret into the password gate.
 *  2. A real GET /api/admin/issue is attempted with that secret.
 *     - 200 → authenticated, secret is stored in component state.
 *     - non-200 → show error, stay on gate.
 *  3. Authenticated view shows Issues / Politicians tabs.
 */
export default function AdminPage() {
  // Verified secret — stored in state, never persisted to localStorage
  const [secret, setSecret] = useState("");
  const [inputSecret, setInputSecret] = useState("");
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<"issues" | "politicians">("issues");

  // --- Auth handler ---

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setAuthError("");
    try {
      // Verify by actually hitting the API — if 200, the secret is correct
      const res = await fetch("/api/admin/issue", {
        headers: { "x-admin-secret": inputSecret },
      });
      if (res.ok) {
        setSecret(inputSecret);
      } else {
        setAuthError("잘못된 비밀번호입니다.");
      }
    } catch {
      setAuthError("연결 오류가 발생했습니다.");
    } finally {
      setChecking(false);
    }
  }

  // --- Password gate (shown when not authenticated) ---

  if (!secret) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
          color: "var(--foreground)",
        }}
      >
        <form
          onSubmit={handleLogin}
          style={{
            padding: 32,
            borderRadius: 12,
            background: "var(--card, rgba(255,255,255,0.05))",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minWidth: 280,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Admin Panel</h2>
          <input
            type="password"
            placeholder="Admin secret"
            value={inputSecret}
            onChange={(e) => setInputSecret(e.target.value)}
            style={{ ...inputStyle, fontSize: 16 }}
            autoFocus
          />
          {authError && (
            <p style={{ margin: 0, color: "#fca5a5", fontSize: 13 }}>{authError}</p>
          )}
          <button
            type="submit"
            disabled={checking}
            style={{
              padding: "9px 20px",
              borderRadius: 6,
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {checking ? "확인 중..." : "입장"}
          </button>
        </form>
      </div>
    );
  }

  // --- Authenticated admin panel ---

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
        padding: "32px 24px",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>VoteX Admin</h1>
        <button
          onClick={() => setSecret("")}
          style={{
            background: "none",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 6,
            padding: "5px 12px",
            cursor: "pointer",
            color: "#94a3b8",
            fontSize: 13,
          }}
        >
          Logout
        </button>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 24,
          borderBottom: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {(["issues", "politicians"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 20px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: tab === t ? 700 : 400,
              color: tab === t ? "#818cf8" : "#94a3b8",
              // Active tab gets an indigo bottom border as indicator
              borderBottom: tab === t ? "2px solid #4f46e5" : "2px solid transparent",
              fontSize: 14,
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content — rendered by dedicated components in AdminTabs.tsx */}
      {tab === "issues" ? (
        <IssuesTab secret={secret} />
      ) : (
        <PoliticiansTab secret={secret} />
      )}
    </div>
  );
}
