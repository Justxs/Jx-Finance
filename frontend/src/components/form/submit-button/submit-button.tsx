import type { ComponentProps } from "react";
import { useFormContext } from "@/components/form/form-context";
import { Button } from "@/components/ui/button/button";

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
