import { Send } from "lucide-react";
import type { ReactNode } from "react";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";

interface ChannelActionsProps {
  error: unknown;
  testLabel: string;
  testPending: boolean;
  canTest: boolean;
  onTest: () => void;
  children: ReactNode;
}

export function ChannelActions({
  error,
  testLabel,
  testPending,
  canTest,
  onTest,
  children,
}: Readonly<ChannelActionsProps>) {
  return (
    <>
      <FormError error={error} />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          pending={testPending}
          disabled={!canTest}
          onClick={onTest}
        >
          <Send />
          {testLabel}
        </Button>
        {children}
      </div>
    </>
  );
}
