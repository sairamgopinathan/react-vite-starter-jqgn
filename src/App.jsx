import { useState } from "react";
import "./App.css";

export default function App() {
  const [text, setText] = useState("");

  return (
    <div style={{ maxWidth: 900, margin: "60px auto", padding: 16, fontFamily: "system-ui" }}>
      <h1>Website Readiness Checker</h1>
      <p style={{ color: "#555" }}>
        Paste your draft content below to check if it’s enterprise-ready.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your content here..."
        rows={12}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 14,
          borderRadius: 10,
          border: "1px solid #ccc"
        }}
      />

      <button
        style={{
          marginTop: 16,
          padding: "10px 16px",
          borderRadius: 10,
          border: 0,
          background: "#0b5cff",
          color: "white",
          fontSize: 14,
          cursor: "pointer"
        }}
        onClick={() => alert("Next step: AI review")}
      >
        Review content
      </button>
    </div>
  );
}
