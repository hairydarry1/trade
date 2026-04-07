import React from "react";

export default function LoadingSkeleton({ type = "card", count = 1 }) {
  const shimmer = {
    background: "linear-gradient(90deg, var(--bg3) 25%, var(--bg4) 50%, var(--bg3) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
  };

  if (type === "card") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ 
            padding: 16, 
            marginBottom: 8, 
            background: "var(--bg3)", 
            borderRadius: 8,
            border: "1px solid var(--border)"
          }}>
            <div style={{ ...shimmer, height: 14, width: "40%", marginBottom: 8, borderRadius: 4 }} />
            <div style={{ ...shimmer, height: 10, width: "70%", marginBottom: 6, borderRadius: 4 }} />
            <div style={{ ...shimmer, height: 10, width: "50%", borderRadius: 4 }} />
          </div>
        ))}
      </>
    );
  }

  if (type === "chart") {
    return (
      <div style={{ 
        height: 300, 
        background: "var(--bg3)", 
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div style={{ ...shimmer, width: 200, height: 200, borderRadius: "50%" }} />
      </div>
    );
  }

  if (type === "table-row") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ 
            display: "flex", 
            gap: 12, 
            padding: "12px 0",
            borderBottom: "1px solid var(--border)"
          }}>
            <div style={{ ...shimmer, height: 12, width: 60, borderRadius: 4 }} />
            <div style={{ ...shimmer, height: 12, flex: 1, borderRadius: 4 }} />
            <div style={{ ...shimmer, height: 12, width: 80, borderRadius: 4 }} />
          </div>
        ))}
      </>
    );
  }

  return null;
}
