import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error to console
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Could also send to error tracking service here
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    this.handleReset();
    // Navigate to home/chat if using router
    window.location.hash = "#/chat";
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card rounded-xl shadow-lg border border-border p-6 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-destructive" size={32} />
            </div>

            {/* Error Message */}
            <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred. Don't worry, your data is safe.
            </p>

            {/* Error Details (collapsible) */}
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <Bug size={14} />
                  Technical details
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-lg text-xs font-mono overflow-auto max-h-32">
                  <p className="text-destructive font-medium">
                    {this.state.error.name}: {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="mt-2 text-muted-foreground whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-nexus-500 text-white rounded-lg hover:bg-nexus-600 transition-colors"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                <Home size={16} />
                Go Home
              </button>
            </div>

            {/* Help Text */}
            <p className="mt-6 text-xs text-muted-foreground">
              If this problem persists, try reloading the app or check the
              console for more details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional component error handling
export function useErrorHandler(): (error: Error) => void {
  return (error: Error) => {
    console.error("Error caught by useErrorHandler:", error);
    // Could trigger error boundary or show toast
  };
}

// Wrapper component for async error handling
interface AsyncBoundaryProps {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
}

export function AsyncBoundary({
  children,
  errorFallback,
}: Omit<AsyncBoundaryProps, "loadingFallback">): React.ReactElement {
  return <ErrorBoundary fallback={errorFallback}>{children}</ErrorBoundary>;
}
