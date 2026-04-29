import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isRecovering: boolean;
}

const UPDATE_RECOVERY_KEY = "moviebay:update-recovery-attempted";

function isUpdateError(error: Error | null) {
  const message = error?.message || "";
  return (
    error?.name === "ChunkLoadError" ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module")
  );
}

async function clearAppCaches() {
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
  }

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    registrations.forEach((registration) => {
      registration.active?.postMessage("clearCaches");
      registration.waiting?.postMessage("skipWaiting");
    });
  }
}

function forceFreshReload() {
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set("sw", Date.now().toString());
  window.location.replace(currentUrl.toString());
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isRecovering: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, isRecovering: isUpdateError(error) };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);

    if (!isUpdateError(error)) return;

    const alreadyTried = sessionStorage.getItem(UPDATE_RECOVERY_KEY) === "1";
    if (alreadyTried) {
      this.setState({ isRecovering: false });
      return;
    }

    sessionStorage.setItem(UPDATE_RECOVERY_KEY, "1");
    void clearAppCaches().finally(forceFreshReload);
  }

  private handleManualReload = () => {
    sessionStorage.removeItem(UPDATE_RECOVERY_KEY);
    void clearAppCaches().finally(forceFreshReload);
  }

  public render() {
    if (this.state.hasError) {
      // Check if it's a chunk load error to provide a specific message
      const isChunkLoadError = isUpdateError(this.state.error);
                               
      return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-6 bg-background text-foreground overflow-auto">
          <div className="max-w-md w-full bg-card border border-border/50 rounded-2xl p-8 shadow-2xl text-center">
            <h1 className="text-2xl font-bold mb-3 text-destructive drop-shadow-sm">
              {isChunkLoadError && this.state.isRecovering ? 'Updating MovieBay' : isChunkLoadError ? 'Update Available' : 'Something went wrong'}
            </h1>
            
            <p className="text-muted-foreground mb-8">
              {isChunkLoadError && this.state.isRecovering
                ? 'Getting the newest version ready...'
                : isChunkLoadError 
                ? 'We just released a new version of MovieBay. Please reload the page to continue watching.'
                : 'An unexpected error occurred while rendering this page.'}
            </p>
            
            {this.state.isRecovering ? (
              <div className="mx-auto mb-6 h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            ) : (
              <button 
                onClick={this.handleManualReload}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold py-3 px-8 rounded-lg transition-all shadow-lg active:scale-95 w-full mb-6"
              >
                Reload & Force Update
              </button>
            )}
            
            {!isChunkLoadError && (
              <div className="text-left">
                <details className="text-xs group">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors mb-2">
                    Show technical details
                  </summary>
                  <div className="bg-muted p-4 rounded-lg border border-destructive/20 opacity-80 mt-2 text-destructive">
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
