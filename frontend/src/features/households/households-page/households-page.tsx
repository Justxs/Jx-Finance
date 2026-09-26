import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { PageHeader } from "@/components/page-header/page-header";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { CreateHouseholdForm } from "../create-household-form/create-household-form";
import { HouseholdCard } from "../household-card/household-card";

export function HouseholdsPage() {
  const { t } = useTranslation();

  const households = useHouseholdsSuspense();
  const householdList = households.data;

  return (
    <div className="space-y-5">
      <PageHeader title={t("households.title")}>
        <CreateDialog label={t("households.add")} title={t("households.add")}>
          {(close) => <CreateHouseholdForm onClose={close} />}
        </CreateDialog>
      </PageHeader>

      {householdList.length === 0 ? (
        <EmptyText>{t("households.empty")}</EmptyText>
      ) : (
        householdList.map((household) => <HouseholdCard key={household.id} household={household} />)
      )}
    </div>
  );
}
