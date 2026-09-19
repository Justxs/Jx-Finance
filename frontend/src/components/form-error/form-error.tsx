import type { ApiError } from "@/api/client";
import { errorMessage } from "@/lib/query-client";
import { cn } from "@/lib/utils";

interface Props {
  error: unknown;
  className?: string;
}

function fieldReasons(error: unknown) {
  if (typeof error !== "object" || error === null || !("errors" in error)) {
    return [];
  }

  return ((error as ApiError).errors ?? []).map((detail) => detail.reason);
}

export function FormError({ error, className }: Readonly<Props>) {
  if (error === null || error === undefined) {
    return null;
  }

  const { title, description } = errorMessage(error);
  const reasons = fieldReasons(error);
  const listed = reasons.length > 1;

  return (
    <div
      role="alert"
      className={cn("col-span-full border-t border-expense pt-2 text-sm text-expense", className)}
    >
      <p className="font-medium">{title}</p>
      {listed ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}
      {!listed && description ? <p>{description}</p> : null}
    </div>
  );
}
