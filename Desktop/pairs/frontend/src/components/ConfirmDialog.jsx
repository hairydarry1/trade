import React from "react";

export default function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "Confirm", cancelLabel = "Cancel" }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.7)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
    }}>
      <div style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: 20,
        maxWidth: 300,
        width: "90%",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--muted2)", marginBottom: 16 }}>{message}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button 
            onClick={onCancel}
            style={{ flex: 1, padding: "8px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--muted2)", cursor: "pointer", fontSize: 12 }}
          >
            {cancelLabel}
          </button>
          <button 
            onClick={onConfirm}
            style={{ flex: 1, padding: "8px 12px", background: "var(--green)", border: "none", borderRadius: 4, color: "#000", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
