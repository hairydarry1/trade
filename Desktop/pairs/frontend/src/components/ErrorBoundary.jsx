import React from "react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 40,
          textAlign: "center",
          background: "#1a1a2e",
          minHeight: "100vh",
          color: "#fff",
          fontFamily: "JetBrains Mono, monospace"
        }}>
          <h2 style={{ color: "#ff2d55", marginBottom: 16 }}>Something went wrong</h2>
          <p style={{ color: "#888", marginBottom: 24 }}>{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "12px 24px",
              background: "#2196F3",
              border: "none",
              borderRadius: 4,
              color: "#fff",
              cursor: "pointer",
              fontSize: 14
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}