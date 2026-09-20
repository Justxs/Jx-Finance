import type { ComponentProps, ComponentType, SyntheticEvent } from "react";
import { useFormContext } from "../form-context";

type FormProps = Omit<ComponentProps<"form">, "onSubmit" | "noValidate">;

interface Props extends FormProps {
  as?: ComponentType<ComponentProps<"form"> & { as: "form" }>;
  onBeforeSubmit?: () => void;
}

export function FormShell({ as: Container, onBeforeSubmit, ...props }: Readonly<Props>) {
  const form = useFormContext();

  function handleSubmit(event: SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();
    onBeforeSubmit?.();
    void form.handleSubmit();
  }

  if (Container) {
    return <Container as="form" onSubmit={handleSubmit} noValidate {...props} />;
  }

  return <form onSubmit={handleSubmit} noValidate {...props} />;
}
