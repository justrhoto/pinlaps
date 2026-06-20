import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Catches render-time errors anywhere below it and shows a recovery screen
 * instead of an unrecoverable white page.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled error:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-background flex min-h-screen items-center justify-center p-6">
          <div className="max-w-md space-y-4 text-center">
            <h1>Something went wrong</h1>
            <p className="text-muted-foreground">
              The app hit an unexpected error. Your saved data is untouched —
              try reloading.
            </p>
            <Button onClick={() => window.location.reload()}>
              Reload app
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
