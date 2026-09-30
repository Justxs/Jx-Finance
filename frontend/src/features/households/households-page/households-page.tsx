import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { SettingsLayout } from "@/components/settings-layout/settings-layout";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { SectionHeader } from "@/components/ui/section/section";
import { CreateHouseholdForm } from "@/features/households/create-household-form/create-household-form";
import { HouseholdCard } from "@/features/households/household-card/household-card";

export function HouseholdsPage() {
  const { t } = useTranslation();

  const households = useHouseholdsSuspense();
  const householdList = households.data;

  return (
    <SettingsLayout current="households">
      <SectionHeader title={t("households.title")}>
        <CreateDialog secondary label={t("households.add")} title={t("households.add")}>
          {(close) => <CreateHouseholdForm onClose={close} />}
        </CreateDialog>
      </SectionHeader>

      {householdList.length === 0 ? (
        <EmptyText>{t("households.empty")}</EmptyText>
      ) : (
        householdList.map((household) => <HouseholdCard key={household.id} household={household} />)
      )}
    </SettingsLayout>
  );
}
