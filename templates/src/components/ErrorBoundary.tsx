import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] p-6 bg-background text-destructive overflow-auto font-mono text-sm">
          <h1 className="text-xl font-bold mb-4 drop-shadow-sm">Something went wrong.</h1>
          <div className="bg-muted p-4 rounded-xl border border-destructive/20 mb-4 opacity-80">
            <pre className="whitespace-pre-wrap break-all">{this.state.error?.toString()}</pre>
          </div>
          <div className="bg-muted p-4 rounded-xl border border-border/50 opacity-60">
            <pre className="whitespace-pre-wrap break-all text-[10px] leading-relaxed">{this.state.error?.stack}</pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
