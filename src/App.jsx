import { useMemo, useState } from "react";
import "./App.css";

const PAGE_TYPES = [
  { id: "homepage", label: "Homepage" },
  { id: "feature", label: "Feature page" },
  { id: "blog", label: "Blog" },
  { id: "helpdocs", label: "Help Docs" },
];

const AUDIENCES = [
  { id: "smb", label: "SMB" },
  { id: "enterprise", label: "Enterprise" },
];

// ------- Mock review engine (placeholder until API) -------
const BANNED_PHRASES = [
  "agent has no sense",
  "has no sense",
  "mind-blowing",
  "crazy",
  "insane",
  "magic",
];

const ABSOLUTES = ["always", "guarantee", "guaranteed", "never", "perfect", "100%"];
const ANTHRO = ["thinks", "feels", "decides", "wants", "knows", "has a mind"];

function findMatches(text, phrases) {
  const lower = (text || "").toLowerCase();
  const found = [];
  for (const p of phrases) {
    if (lower.includes(p.toLowerCase())) found.push(p);
  }
  return found;
}

function mockReview(text) {
  const flags = [];

  // Exclamation overuse
  const excls = (text.match(/!/g) || []).length;
  if (excls > 3) {
    flags.push({
      severity: "amber",
      code: "EXCLAMATION_OVERUSE",
      message: `Too many exclamation marks (${excls}). Enterprise tone should be restrained.`,
      matches: ["!"],
    });
  }

  // Banned phrases
  const banned = findMatches(text, BANNED_PHRASES);
  if (banned.length) {
    flags.push({
      severity: "red",
      code: "UNPROFESSIONAL_LANGUAGE",
      message: "Unprofessional / jokey phrasing detected.",
      matches: banned,
    });
  }

  // Absolute claims
  const absHits = findMatches(text, ABSOLUTES);
  if (absHits.length) {
    flags.push({
      severity: "red",
      code: "ABSOLUTE_CLAIMS",
      message: "Absolute/guarantee language detected. Use bounded claims.",
      matches: absHits,
    });
  }

  // Anthropomorphism
  const anthHits = findMatches(text, ANTHRO);
  if (anthHits.length) {
    flags.push({
      severity: "amber",
      code: "ANTHROPOMORPHISM",
      message: "Human-like agent wording detected. Prefer capability + controls language.",
      matches: anthHits,
    });
  }

  // Simple scoring
  const redCount = flags.filter((f) => f.severity === "red").length;
  const amberCount = flags.filter((f) => f.severity === "amber").length;
  let score = 92 - redCount * 18 - amberCount * 10;
  score = Math.max(0, Math.min(100, score));

  let status = "PASS";
  if (redCount > 0) status = "DO NOT PUBLISH";
  else if (score < 85) status = "NEEDS REWORK";

  // Minimal rewrite (light edits)
  const minimal = (text || "")
    .replace(/!+/g, ".")
    .replace(/agent has no sense/gi, "the agent may require review in low-confidence cases")
    .replace(/\b(always|never|perfect|100%)\b/gi, "typically")
    .replace(/\bguarantee(d)?\b/gi, "aims to");

  // Enterprise rewrite (template-y for now)
  const enterprise = `Rewrite (enterprise tone):

${summarizeFirstLine(text)}

Key points:
- Capability: Describes what the feature does in clear, bounded terms.
- Controls: Uses permissions, approvals, and audit logs for governance.
- Reliability: Flags low-confidence outputs for human review.
- Outcomes: Improves productivity while maintaining compliance and traceability.`;

  return { score, status, flags, rewrites: { minimal, enterprise } };
}

function summarizeFirstLine(text) {
  const t = (text || "").trim().replace(/\s+/g, " ");
  if (!t) return "Provide a draft to generate a rewrite.";
  return t.length > 140 ? t.slice(0, 140) + "…" : t;
}

// ------- UI Components -------
function StatusPill({ status }) {
  const map = {
    "PASS": { bg: "#eaffea", fg: "#0a6b0a", label: "Content check: PASS" },
    "NEEDS REWORK": { bg: "#fff6df", fg: "#7a4d00", label: "Content check: NEEDS REWORK" },
    "DO NOT PUBLISH": { bg: "#ffeded", fg: "#b00020", label: "Content check: DO NOT PUBLISH" },
  };
  const s = map[status] || map["NEEDS REWORK"];
  return (
    <span style={{ background: s.bg, color: s.fg, padding: "6px 10px", borderRadius: 999, fontSize: 13, fontWeight: 700 }}>
      {s.label}
    </span>
  );
}

function FlagCard({ flag }) {
  return (
    <div style={{ border: "1px solid #2b2b2b", borderRadius: 12, padding: 12, background: "#141414" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 700,
            background: flag.severity === "red" ? "#ffeded" : "#fff6df",
            color: flag.severity === "red" ? "#b00020" : "#7a4d00",
          }}
        >
          {flag.severity.toUpperCase()}
        </span>
        <div style={{ fontWeight: 800 }}>{flag.code}</div>
      </div>
      <div style={{ color: "#cfcfcf", fontSize: 13 }}>{flag.message}</div>
      {flag.matches?.length ? (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
          {flag.matches.slice(0, 10).map((m, idx) => (
            <span key={idx} style={{ background: "#222", border: "1px solid #333", borderRadius: 999, padding: "4px 10px", fontSize: 12 }}>
              {m}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ScoreRing({ score }) {
  const size = 110;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const dash = (pct / 100) * c;

  // Color logic
  const color = pct >= 85 ? "#3bd16f" : pct >= 70 ? "#ffbf3c" : "#ff4d4d";

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#2a2a2a"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontWeight: 900,
          fontSize: 26,
        }}
      >
        {pct}
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  return (
    <button
      onClick={() => navigator.clipboard.writeText(text || "")}
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        border: "1px solid #2b2b2b",
        background: "#1a1a1a",
        color: "white",
        cursor: "pointer",
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      Copy
    </button>
  );
}

export default function App() {
  const [pageType, setPageType] = useState("feature");
  const [audience, setAudience] = useState("enterprise");
  const [text, setText] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const canReview = useMemo(() => text.trim().length >= 30 && !loading, [text, loading]);

  async function onReview() {
    setLoading(true);
    setResult(null);

    // Fake delay so UI behaves like the real thing
    await new Promise((r) => setTimeout(r, 600));

    // For now, run mock locally
    const r = mockReview(text);
    setResult(r);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 1100, margin: "42px auto", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 44, fontWeight: 900 }}>Website Readiness Checker</h1>
        <div style={{ color: "#bfbfbf", marginTop: 8 }}>
          Check enterprise tone, unsafe claims, and unprofessional language before publishing.
        </div>
      </div>

      {/* Inputs */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#d9d9d9" }}>
          Page type
          <select value={pageType} onChange={(e) => setPageType(e.target.value)} style={{ padding: 8, borderRadius: 10 }}>
            {PAGE_TYPES.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#d9d9d9" }}>
          Audience
          <select value={audience} onChange={(e) => setAudience(e.target.value)} style={{ padding: 8, borderRadius: 10 }}>
            {AUDIENCES.map((a) => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your content here…"
          rows={10}
          style={{
            width: "100%",
            padding: 14,
            fontSize: 14,
            borderRadius: 14,
            border: "1px solid #2b2b2b",
            background: "#111",
            color: "white",
          }}
        />

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12 }}>
          <button
            onClick={onReview}
            disabled={!canReview}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: 0,
              background: canReview ? "#0b5cff" : "#2c2c2c",
              color: "white",
              fontSize: 14,
              fontWeight: 800,
              cursor: canReview ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Reviewing…" : "Review"}
          </button>

          <button
            onClick={() => { setText(""); setResult(null); }}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid #2b2b2b",
              background: "#141414",
              color: "white",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div style={{ marginTop: 26 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
            <ScoreRing score={result.score} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
              <StatusPill status={result.status} />
              <div style={{ color: "#bfbfbf", fontSize: 13 }}>
                Checked: tone, hype language, AI-claims safety, anthropomorphism, punctuation.
              </div>
              <div style={{ color: "#8f8f8f", fontSize: 12 }}>
                Page: {PAGE_TYPES.find(p => p.id === pageType)?.label} · Audience: {AUDIENCES.find(a => a.id === audience)?.label}
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 1100, margin: "22px auto 0" }}>
            <h2 style={{ margin: "0 0 10px 0" }}>Red flags</h2>
            {result.flags.length === 0 ? (
              <div style={{ padding: 12, border: "1px solid #2b2b2b", borderRadius: 12, background: "#141414", color: "#cfcfcf" }}>
                No red flags detected.
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {result.flags.map((f, i) => <FlagCard key={i} flag={f} />)}
              </div>
            )}
          </div>

          <div style={{ maxWidth: 1100, margin: "22px auto 0" }}>
            <h2 style={{ margin: "0 0 10px 0" }}>Rewrites</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Minimal */}
              <div style={{ border: "1px solid #2b2b2b", borderRadius: 14, background: "#141414", padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Minimal rewrite</h3>
                  <CopyButton text={result.rewrites.minimal} />
                </div>
                <pre style={{ whiteSpace: "pre-wrap", color: "#e8e8e8", marginTop: 10, fontSize: 13, lineHeight: 1.45 }}>
                  {result.rewrites.minimal}
                </pre>
              </div>

              {/* Enterprise */}
              <div style={{ border: "1px solid #2b2b2b", borderRadius: 14, background: "#141414", padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Enterprise rewrite</h3>
                  <CopyButton text={result.rewrites.enterprise} />
                </div>
                <pre style={{ whiteSpace: "pre-wrap", color: "#e8e8e8", marginTop: 10, fontSize: 13, lineHeight: 1.45 }}>
                  {result.rewrites.enterprise}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
