import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { useFormContext } from "../form-context";

type Props = Omit<ComponentProps<typeof Button>, "type">;

export function SubmitButton({ pending, disabled, children, ...props }: Readonly<Props>) {
  const form = useFormContext();

  return (
    <form.Subscribe selector={(state) => state.canSubmit}>
      {(canSubmit) => (
        <Button type="submit" pending={pending} disabled={!canSubmit || disabled} {...props}>
          {children}
        </Button>
      )}
    </form.Subscribe>
  );
}
