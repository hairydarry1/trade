import React, { useEffect } from "react";

const STYLES = {
  success: { bg: "rgba(0,217,139,0.15)", border: "rgba(0,217,139,0.4)", color: "#00d98b" },
  error: { bg: "rgba(255,45,85,0.15)", border: "rgba(255,45,85,0.4)", color: "#ff6b80" },
  info: { bg: "rgba(45,143,255,0.12)", border: "rgba(45,143,255,0.35)", color: "#2d8fff" },
  warn: { bg: "rgba(255,171,0,0.12)", border: "rgba(255,171,0,0.35)", color: "#ffab00" },
};

export default function Toast({ type = "info", msg, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [msg, duration, onClose]);

  if (!msg) return null;

  const s = STYLES[type] || STYLES.info;

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      left: "50%",
      transform: "translateX(-50%)",
      padding: "10px 20px",
      borderRadius: 8,
      background: s.bg,
      border: `1px solid ${s.border}`,
      color: s.color,
      fontFamily: "var(--font-ui)",
      fontSize: 13,
      fontWeight: 600,
      zIndex: 9999,
      cursor: "pointer",
      whiteSpace: "nowrap",
    }} onClick={onClose}>
      {msg}
    </div>
  );
}
