import { useTranslation } from "react-i18next";
import { isApiError } from "@/api/client";
import { Disclosure } from "@/components/disclosure/disclosure";

interface Props {
  error: unknown;
}

function describeError(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const summary = `${error.name}: ${error.message}`;
  const response = isApiError(error)
    ? [`HTTP ${error.status}${error.code ? ` ${error.code}` : ""}`]
    : [];
  const trace = (error.stack ?? "").replace(summary, "").trim();

  return [...response, summary, trace].filter(Boolean).join("\n");
}

export function ErrorDetails({ error }: Readonly<Props>) {
  const { t } = useTranslation();

  if (error === undefined) {
    return null;
  }

  return (
    <Disclosure className="mt-5" summary={t("errors.details")}>
      <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-5 wrap-break-word whitespace-pre-wrap text-muted-foreground select-all">
        {describeError(error)}
      </pre>
    </Disclosure>
  );
}
