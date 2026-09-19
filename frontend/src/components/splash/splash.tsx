import { useTranslation } from "react-i18next";

export function Splash() {
  const { t } = useTranslation();

  return (
    <div className="splash" role="status" aria-label={t("errors.loading")}>
      <div className="splash-mark" />
      <div className="splash-rule" />
    </div>
  );
}
