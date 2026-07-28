import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-navy-950 text-slate-200 p-6">
          <div className="glass-card p-8 max-w-md text-center">
            <h1 className="text-xl font-semibold text-signal-down mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-400 mb-4">{this.state.message || "An unexpected error occurred."}</p>
            <button className="btn-primary" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
