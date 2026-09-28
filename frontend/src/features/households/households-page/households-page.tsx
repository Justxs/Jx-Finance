import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { SectionHeader } from "@/components/ui/section/section";
import { SettingsLayout } from "@/features/settings/settings-nav/settings-nav";
import { CreateHouseholdForm } from "../create-household-form/create-household-form";
import { HouseholdCard } from "../household-card/household-card";

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
