import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Component, type ErrorInfo, type ReactNode, Suspense, ViewTransition } from "react";
import { ErrorState } from "@/components/error-state/error-state";

interface FallbackProps {
  onReset: () => void;
  className?: string;
  subject?: string;
  errorFallback?: ReactNode;
  renderError?: (retry: () => void) => ReactNode;
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

    if (this.props.renderError) {
      return this.props.renderError(retry);
    }

    if (this.props.errorFallback !== undefined) {
      return this.props.errorFallback;
    }

    return (
      <ErrorState className={this.props.className} subject={this.props.subject} onRetry={retry} />
    );
  }
}

interface Props {
  fallback: ReactNode;
  children: ReactNode;
  errorClassName?: string;
  errorSubject?: string;
  errorFallback?: ReactNode;
  renderError?: (retry: () => void) => ReactNode;
  reveal?: boolean;
}

export function QueryBoundary({
  fallback,
  children,
  errorClassName,
  errorSubject,
  errorFallback,
  renderError,
  reveal = true,
}: Readonly<Props>) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onReset={reset}
          className={errorClassName}
          subject={errorSubject}
          errorFallback={errorFallback}
          renderError={renderError}
        >
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
