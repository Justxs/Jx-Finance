import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Component, type ErrorInfo, type ReactNode, Suspense, ViewTransition } from "react";
import { ErrorState } from "@/components/error-state";

interface FallbackProps {
  onReset: () => void;
  className?: string;
  errorFallback?: ReactNode;
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

    if (this.props.errorFallback !== undefined) {
      return this.props.errorFallback;
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
  errorFallback?: ReactNode;
  reveal?: boolean;
}

export function QueryBoundary({
  fallback,
  children,
  errorClassName,
  errorFallback,
  reveal = true,
}: Readonly<Props>) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} className={errorClassName} errorFallback={errorFallback}>
          {reveal ? (
            <Suspense
              fallback={
                <ViewTransition exit="reveal-out" enter="none" update="none" share="none">
                  {fallback}
                </ViewTransition>
              }
            >
              <ViewTransition enter="reveal-in" exit="none" update="none" share="none">
                {children}
              </ViewTransition>
            </Suspense>
          ) : (
            <Suspense fallback={fallback}>{children}</Suspense>
          )}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
