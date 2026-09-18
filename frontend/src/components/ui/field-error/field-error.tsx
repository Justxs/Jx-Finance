interface Props {
  id?: string;
  message?: string;
}

export function FieldError({ id, message }: Readonly<Props>) {
  if (!message) {
    return null;
  }
  return (
    <p id={id} className="text-xs font-medium text-expense">
      {message}
    </p>
  );
}
