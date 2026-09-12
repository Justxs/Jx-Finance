import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Component, type ErrorInfo, type ReactNode, Suspense } from "react";
import { ErrorState } from "@/components/error-state";

interface FallbackProps {
  onReset: () => void;
  className?: string;
}

interface BoundaryProps extends FallbackProps {
  children: ReactNode;
}

interface BoundaryState {
  failed: boolean;
}

class ErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  override render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <ErrorState
        className={this.props.className}
        onRetry={() => {
          this.setState({ failed: false });
          this.props.onReset();
        }}
      />
    );
  }
}

interface Props {
  fallback: ReactNode;
  children: ReactNode;
  errorClassName?: string;
}

export function QueryBoundary({ fallback, children, errorClassName }: Readonly<Props>) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} className={errorClassName}>
          <Suspense fallback={fallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
