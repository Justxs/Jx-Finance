import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useGetPingEndpoint } from "@/api/generated";

export function HomePage() {
  const { t } = useTranslation();
  const ping = useGetPingEndpoint();

  let statusLabel = t("status.ok");
  if (ping.isLoading) {
    statusLabel = t("status.loading");
  } else if (ping.isError) {
    statusLabel = t("status.error");
  }

  let statusTone = "bg-emerald-500";
  if (ping.isLoading) {
    statusTone = "bg-amber-400";
  } else if (ping.isError) {
    statusTone = "bg-destructive";
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="card w-full max-w-lg p-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary">
          {t("appName")}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-foreground md:text-4xl">
          {t("welcome.title")}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted-foreground">{t("welcome.subtitle")}</p>

        <div className="mt-8 flex justify-center">
          <Button size="lg">{t("welcome.cta")}</Button>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className={`h-2 w-2 rounded-full ${statusTone}`} />
          <span>
            {t("status.label")}: {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
