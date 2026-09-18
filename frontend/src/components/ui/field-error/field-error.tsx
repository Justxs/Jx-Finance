interface Props {
  message?: string;
}

export function FieldError({ message }: Readonly<Props>) {
  if (!message) {
    return null;
  }
  return <p className="text-xs font-medium text-destructive">{message}</p>;
}
