import { useTranslation } from "react-i18next";
import { useDateTime } from "@/hooks/use-formatters";

interface DeliveryStatusProps {
  configured: boolean;
  lastDeliveredAt: string | null;
  lastError: string | null;
}

export function DeliveryStatus({
  configured,
  lastDeliveredAt,
  lastError,
}: Readonly<DeliveryStatusProps>) {
  const { t } = useTranslation();
  const formatDateTime = useDateTime();

  const delivery =
    configured &&
    (lastDeliveredAt
      ? t("settings.notificationProviders.lastDelivered", { date: formatDateTime(lastDeliveredAt) })
      : t("settings.notificationProviders.neverDelivered"));

  if (!delivery && !lastError) {
    return null;
  }

  return (
    <div className="max-w-prose space-y-0.5 text-sm text-muted-foreground">
      {delivery ? <p>{delivery}</p> : null}
      {lastError ? (
        <p className="wrap-break-word">
          {t("settings.notificationProviders.lastError", { error: lastError })}
        </p>
      ) : null}
    </div>
  );
}
