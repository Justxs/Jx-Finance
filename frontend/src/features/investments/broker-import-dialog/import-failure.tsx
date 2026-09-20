import { errorMessage } from "@/lib/query-client";

interface Props {
  error: unknown;
}

export function BrokerImportFailure({ error }: Readonly<Props>) {
  if (error === null || error === undefined) {
    return null;
  }

  const { title, description } = errorMessage(error);

  return (
    <p role="alert" className="text-sm wrap-break-word text-expense">
      {description ?? title}
    </p>
  );
}
