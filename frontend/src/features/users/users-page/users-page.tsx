import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useUsersSuspense } from "@/api/generated";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { SettingsLayout } from "@/components/settings-layout/settings-layout";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { CreateUserForm } from "@/features/users/create-user-form/create-user-form";
import { userListParams } from "@/features/users/user-queries";
import { UsersTable } from "@/features/users/users-table/users-table";
import { useDeferredParams } from "@/hooks/use-deferred-params";

export function UsersPage() {
  const { t } = useTranslation();
  const [shown, stale] = useDeferredParams(useSearch({ from: "/users" }));
  const users = useUsersSuspense(userListParams(shown));

  return (
    <SettingsLayout current="users">
      <Section>
        <SectionHeader title={t("users.title")}>
          <CreateDialog secondary label={t("users.add")} title={t("users.add")}>
            {(close) => <CreateUserForm onClose={close} />}
          </CreateDialog>
        </SectionHeader>
        <UsersTable users={users.data} stale={stale} />
      </Section>
    </SettingsLayout>
  );
}
