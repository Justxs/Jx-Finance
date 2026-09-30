import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SettingsLayout } from "@/components/settings-layout/settings-layout";

interface Props {
  current: ComponentProps<typeof SettingsLayout>["current"];
  children: ReactNode;
}

export function SettingsPending({ current, children }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">
        {t("errors.loading")}
      </span>
      <SettingsLayout current={current}>
        <div aria-hidden="true" className="space-y-5">
          {children}
        </div>
      </SettingsLayout>
    </div>
  );
}
