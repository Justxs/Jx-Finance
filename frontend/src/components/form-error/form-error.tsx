import { serverErrorText, unplacedServerErrors } from "@/lib/form-server-errors";
import { errorMessage } from "@/lib/query-client";
import { cn } from "@/lib/utils";

interface Props {
  error: unknown;
  className?: string;
}

export function FormError({ error, className }: Readonly<Props>) {
  if (error === null || error === undefined) {
    return null;
  }

  const { placedAny, unplaced } = unplacedServerErrors(error);

  if (placedAny && unplaced.length === 0) {
    return null;
  }

  const { title, description } = errorMessage(error);
  const reasons = unplaced.map(serverErrorText);
  const listed = placedAny || reasons.length > 1;

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
