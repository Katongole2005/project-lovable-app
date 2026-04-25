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
      // Check if it's a chunk load error to provide a specific message
      const isChunkLoadError = this.state.error?.name === 'ChunkLoadError' || 
                               this.state.error?.message?.includes('Failed to fetch dynamically imported module');
                               
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-background text-foreground overflow-auto">
          <div className="max-w-md w-full bg-card border border-border/50 rounded-2xl p-8 shadow-2xl text-center">
            <h1 className="text-2xl font-bold mb-3 text-destructive drop-shadow-sm">
              {isChunkLoadError ? 'Update Available' : 'Something went wrong'}
            </h1>
            
            <p className="text-muted-foreground mb-8">
              {isChunkLoadError 
                ? 'We just released a new version of MovieBay. Please reload the page to continue watching.'
                : 'An unexpected error occurred while rendering this page.'}
            </p>
            
            <button 
              onClick={() => {
                const currentUrl = new URL(window.location.href);
                currentUrl.searchParams.set('v', Date.now().toString());
                window.location.href = currentUrl.toString();
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95 w-full mb-6"
            >
              Reload & Force Update
            </button>
            
            {!isChunkLoadError && (
              <div className="text-left">
                <details className="text-xs group">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors mb-2">
                    Show technical details
                  </summary>
                  <div className="bg-muted p-4 rounded-xl border border-destructive/20 opacity-80 mt-2 text-destructive">
                    <pre className="whitespace-pre-wrap break-all font-mono">{this.state.error?.toString()}</pre>
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
