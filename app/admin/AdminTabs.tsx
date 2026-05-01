"use client";

import { useState, useEffect, useCallback } from "react";

// --- Types ---

export interface DbIssue {
  id: string;
  title: string;
  summary: string;
  category: string;
  lang: string;
  leaning: number;
  expires_at: string;
  created_at?: string;
}

export interface DbPolitician {
  id: string;
  name: string;
  party: string;
  role: string;
  country: string;
  lang: string;
  leaning: number;
  photo_url: string | null;
  bio: string | null;
  created_at?: string;
}

// --- Helpers ---

/** Returns a datetime-local string set to N days from now (for default expires_at). */
export function defaultExpiry(daysFromNow = 7): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

/**
 * Shared fetch helper that injects the admin secret header on every request.
 *
 * @param url - API endpoint
 * @param secret - Admin secret value for x-admin-secret header
 * @param options - Standard fetch options (body, method, etc.)
 */
export async function adminFetch(
  url: string,
  secret: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": secret,
      ...(options.headers ?? {}),
    },
  });
}

// --- Shared inline styles (dark theme) ---

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "inherit",
  fontSize: 14,
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#94a3b8",
  marginBottom: 4,
  display: "block",
};

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4 };

const btnStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "9px 20px",
  borderRadius: 6,
  background: "#4f46e5",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
};

// --- Shared UI atoms ---

export function StatusMsg({ msg }: { msg: { text: string; ok: boolean } | null }) {
  if (!msg) return null;
  return (
    <p
      className="mt-2 text-sm rounded px-3 py-2"
      style={{
        background: msg.ok ? "rgba(99,102,241,0.15)" : "rgba(239,68,68,0.15)",
        color: msg.ok ? "#a5b4fc" : "#fca5a5",
        border: `1px solid ${msg.ok ? "rgba(99,102,241,0.3)" : "rgba(239,68,68,0.3)"}`,
      }}
    >
      {msg.text}
    </p>
  );
}

function LeaningSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      <option value="-1">-1 진보</option>
      <option value="0">0 중립</option>
      <option value="1">1 보수</option>
    </select>
  );
}

function LangSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle}>
      <option value="ko">ko</option>
      <option value="en">en</option>
    </select>
  );
}

// --- Issues Tab ---

/**
 * Issues tab: form to create a new issue (Supabase + on-chain), list with delete buttons.
 *
 * @param secret - Admin secret passed down from the authenticated parent
 */
export function IssuesTab({ secret }: { secret: string }) {
  const [issues, setIssues] = useState<DbIssue[]>([]);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("");
  const [lang, setLang] = useState("ko");
  const [leaning, setLeaning] = useState("0");
  const [expiresAt, setExpiresAt] = useState(defaultExpiry(7));

  const loadIssues = useCallback(async () => {
    const res = await adminFetch("/api/admin/issue", secret);
    if (res.ok) {
      const data = await res.json();
      setIssues(data.issues ?? []);
    }
  }, [secret]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await adminFetch("/api/admin/issue", secret, {
        method: "POST",
        body: JSON.stringify({
          id, title, summary, category, lang,
          leaning: Number(leaning),
          expires_at: new Date(expiresAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setStatus({ text: `Created! Sig: ${data.signature?.slice(0, 20)}...`, ok: true });
      setId(""); setTitle(""); setSummary(""); setCategory("");
      setLang("ko"); setLeaning("0"); setExpiresAt(defaultExpiry(7));
      await loadIssues();
    } catch (err) {
      setStatus({ text: String(err instanceof Error ? err.message : err), ok: false });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(issueId: string) {
    if (!confirm(`Delete issue "${issueId}"?`)) return;
    const res = await adminFetch(`/api/admin/issue?id=${issueId}`, secret, { method: "DELETE" });
    if (res.ok) await loadIssues();
    else { const d = await res.json(); alert(d.error ?? "delete failed"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>ID (e.g. ko-5)</label>
            <input style={inputStyle} value={id} onChange={(e) => setId(e.target.value)} required placeholder="ko-5" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Category</label>
            <input style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)} required placeholder="economy" />
          </div>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Title</label>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Summary</label>
          <textarea style={{ ...inputStyle, minHeight: 80, resize: "vertical" }} value={summary} onChange={(e) => setSummary(e.target.value)} required />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Lang</label>
            <LangSelect value={lang} onChange={setLang} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Leaning</label>
            <LeaningSelect value={leaning} onChange={setLeaning} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Expires At</label>
            <input type="datetime-local" style={inputStyle} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} required />
          </div>
        </div>
        <div>
          <button type="submit" style={btnStyle} disabled={loading}>
            {loading ? "Creating..." : "Create Issue"}
          </button>
        </div>
        <StatusMsg msg={status} />
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>ID</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Title</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Category</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Leaning</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Expires</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => (
            <tr key={issue.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{issue.id}</td>
              <td style={{ padding: "6px 8px" }}>{issue.title}</td>
              <td style={{ padding: "6px 8px" }}>{issue.category}</td>
              <td style={{ padding: "6px 8px" }}>{issue.leaning}</td>
              <td style={{ padding: "6px 8px" }}>{new Date(issue.expires_at).toLocaleDateString()}</td>
              <td style={{ padding: "6px 8px" }}>
                <button onClick={() => handleDelete(issue.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>🗑</button>
              </td>
            </tr>
          ))}
          {issues.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 16, color: "#64748b", textAlign: "center" }}>No issues yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- Politicians Tab ---

/**
 * Politicians tab: form to create a politician (Supabase + on-chain), list with delete buttons.
 *
 * @param secret - Admin secret passed down from the authenticated parent
 */
export function PoliticiansTab({ secret }: { secret: string }) {
  const [politicians, setPoliticians] = useState<DbPolitician[]>([]);
  const [status, setStatus] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [party, setParty] = useState("");
  const [role, setRole] = useState("");
  const [country, setCountry] = useState("KR");
  const [lang, setLang] = useState("ko");
  const [leaning, setLeaning] = useState("0");
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");

  const loadPoliticians = useCallback(async () => {
    const res = await adminFetch("/api/admin/politician", secret);
    if (res.ok) {
      const data = await res.json();
      setPoliticians(data.politicians ?? []);
    }
  }, [secret]);

  useEffect(() => { loadPoliticians(); }, [loadPoliticians]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const res = await adminFetch("/api/admin/politician", secret, {
        method: "POST",
        body: JSON.stringify({
          id, name, party, role, country, lang,
          leaning: Number(leaning),
          photo_url: photoUrl || undefined,
          bio: bio || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "failed");
      setStatus({ text: `Created! Sig: ${data.signature?.slice(0, 20)}...`, ok: true });
      setId(""); setName(""); setParty(""); setRole("");
      setCountry("KR"); setLang("ko"); setLeaning("0");
      setPhotoUrl(""); setBio("");
      await loadPoliticians();
    } catch (err) {
      setStatus({ text: String(err instanceof Error ? err.message : err), ok: false });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(politicianId: string) {
    if (!confirm(`Delete politician "${politicianId}"?`)) return;
    const res = await adminFetch(`/api/admin/politician?id=${politicianId}`, secret, { method: "DELETE" });
    if (res.ok) await loadPoliticians();
    else { const d = await res.json(); alert(d.error ?? "delete failed"); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>ID (e.g. lee-jw)</label>
            <input style={inputStyle} value={id} onChange={(e) => setId(e.target.value)} required placeholder="lee-jw" />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Party</label>
            <input style={inputStyle} value={party} onChange={(e) => setParty(e.target.value)} required />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Role</label>
            <input style={inputStyle} value={role} onChange={(e) => setRole(e.target.value)} required placeholder="대표" />
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Country</label>
            <input style={inputStyle} value={country} onChange={(e) => setCountry(e.target.value)} required />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Lang</label>
            <LangSelect value={lang} onChange={setLang} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Leaning</label>
            <LeaningSelect value={leaning} onChange={setLeaning} />
          </div>
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Photo URL (optional)</label>
          <input style={inputStyle} value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="https://..." />
        </div>
        <div style={fieldStyle}>
          <label style={labelStyle}>Bio (optional)</label>
          <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={bio} onChange={(e) => setBio(e.target.value)} />
        </div>
        <div>
          <button type="submit" style={btnStyle} disabled={loading}>
            {loading ? "Creating..." : "Create Politician"}
          </button>
        </div>
        <StatusMsg msg={status} />
      </form>

      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#94a3b8" }}>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>ID</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Name</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Party</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Role</th>
            <th style={{ textAlign: "left", padding: "6px 8px" }}>Leaning</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {politicians.map((p) => (
            <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <td style={{ padding: "6px 8px", fontFamily: "monospace" }}>{p.id}</td>
              <td style={{ padding: "6px 8px" }}>{p.name}</td>
              <td style={{ padding: "6px 8px" }}>{p.party}</td>
              <td style={{ padding: "6px 8px" }}>{p.role}</td>
              <td style={{ padding: "6px 8px" }}>{p.leaning}</td>
              <td style={{ padding: "6px 8px" }}>
                <button onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>🗑</button>
              </td>
            </tr>
          ))}
          {politicians.length === 0 && (
            <tr><td colSpan={6} style={{ padding: 16, color: "#64748b", textAlign: "center" }}>No politicians yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
