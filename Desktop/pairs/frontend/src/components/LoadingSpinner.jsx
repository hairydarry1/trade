import React from "react";

export default function LoadingSpinner({ size = 20, text = "Loading..." }) {
  return (
    <div className="loading-overlay">
      <div className="loading-spinner" style={{ width: size, height: size }} />
      {text && <div className="loading-text">{text}</div>}
    </div>
  );
}
