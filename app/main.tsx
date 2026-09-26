import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./style.css";
class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <div className="loading">
        <h1>Unable to render workspace</h1>
        <p>{this.state.error}</p>
        <button onClick={() => location.reload()}>Reload app</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
