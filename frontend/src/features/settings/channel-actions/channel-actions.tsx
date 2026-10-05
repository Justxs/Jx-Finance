import { Send } from "lucide-react";
import { type ReactNode, useId } from "react";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";

interface ChannelActionsProps {
  error: unknown;
  testLabel: string;
  testHint: string;
  testPending: boolean;
  canTest: boolean;
  onTest: () => void;
  children: ReactNode;
}

export function ChannelActions({
  error,
  testLabel,
  testHint,
  testPending,
  canTest,
  onTest,
  children,
}: Readonly<ChannelActionsProps>) {
  const hintId = useId();

  return (
    <>
      <FormError error={error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          pending={testPending}
          disabled={!canTest}
          focusableWhenDisabled={testPending || !canTest}
          aria-describedby={canTest ? undefined : hintId}
          onClick={onTest}
        >
          <Send />
          {testLabel}
        </Button>
        {canTest ? null : (
          <p id={hintId} className="text-sm text-muted-foreground">
            {testHint}
          </p>
        )}
        {children}
      </div>
    </>
  );
}
