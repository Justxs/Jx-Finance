import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Component, type ErrorInfo, type ReactNode, Suspense, ViewTransition } from "react";
import { ErrorState, RetryContext } from "@/components/error-state/error-state";

interface FallbackProps {
  onReset: () => void;
  subject?: string;
  error?: ReactNode;
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

    const retry = () => {
      this.setState({ failed: false });
      this.props.onReset();
    };

    return (
      <RetryContext value={retry}>
        {this.props.error === undefined ? (
          <ErrorState subject={this.props.subject} />
        ) : (
          this.props.error
        )}
      </RetryContext>
    );
  }
}

interface Props {
  fallback: ReactNode;
  children: ReactNode;
  errorSubject?: string;
  error?: ReactNode;
  reveal?: boolean;
}

export function QueryBoundary({
  fallback,
  children,
  errorSubject,
  error,
  reveal = true,
}: Readonly<Props>) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} subject={errorSubject} error={error}>
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
