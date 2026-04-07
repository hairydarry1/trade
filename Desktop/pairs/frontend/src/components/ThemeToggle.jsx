import React, { useState, useEffect } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        padding: "4px 8px",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 4,
        color: "var(--muted2)",
        cursor: "pointer",
        fontSize: 12,
        marginLeft: 8,
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
