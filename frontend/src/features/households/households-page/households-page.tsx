import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { PageHeader } from "@/components/page-header/page-header";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { CreateHouseholdForm } from "../create-household-form/create-household-form";
import { HouseholdCard } from "../household-card";

export function HouseholdsPage() {
  const { t } = useTranslation();

  const households = useHouseholdsSuspense();
  const householdList = households.data;

  let content: ReactNode;
  if (householdList.length === 0) {
    content = <EmptyText>{t("households.empty")}</EmptyText>;
  } else {
    content = (
      <div className="space-y-5">
        {householdList.map((household) => (
          <HouseholdCard key={household.id} household={household} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("households.title")}>
        <CreateDialog label={t("households.add")} title={t("households.add")}>
          {(close) => <CreateHouseholdForm onCreated={close} onCancel={close} />}
        </CreateDialog>
      </PageHeader>

      {content}
    </div>
  );
}
