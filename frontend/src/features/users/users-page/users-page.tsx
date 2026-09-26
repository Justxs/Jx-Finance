import { useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useDeactivateUser,
  useReactivateUser,
  useUsersSuspense,
  useMeSuspense,
  useUpdateUserRole,
} from "@/api/generated";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { PageHeader } from "@/components/page-header/page-header";
import { Section } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { notify, pendingId } from "@/lib/mutations";
import { CreateUserForm } from "../create-user-form/create-user-form";
import { ResetPasswordDialog } from "../reset-password-dialog/reset-password-dialog";
import { userListParams, userName } from "../user-queries";
import { UsersTable } from "../users-table/users-table";

export function UsersPage() {
  const { t } = useTranslation();
  const [resetId, setResetId] = useState<string | null>(null);

  const me = useMeSuspense();
  const [shown, stale] = useDeferredParams(useSearch({ from: "/users" }));
  const users = useUsersSuspense(userListParams(shown));

  const roleMutation = useUpdateUserRole(notify(t("users.roleUpdated")));
  const deactivateMutation = useDeactivateUser(notify(t("users.deactivated_toast")));
  const reactivateMutation = useReactivateUser(notify(t("users.reactivated_toast")));

  const list = users.data;
  const deactivate = useConfirmedDelete(deactivateMutation, list, userName);

  return (
    <div className="space-y-5">
      <PageHeader title={t("users.title")}>
        <CreateDialog label={t("users.add")} title={t("users.add")}>
          {(close) => <CreateUserForm onClose={close} />}
        </CreateDialog>
      </PageHeader>

      <Section as="div">
        <UsersTable
          users={list}
          stale={stale}
          currentUserId={me.data.id}
          onRoleChange={(id, role) => roleMutation.mutate({ id, data: { role } })}
          rolePendingId={pendingId(roleMutation)}
          onDeactivate={deactivate.request}
          deactivatePendingId={deactivate.pendingId}
          onReactivate={(id) => reactivateMutation.mutate({ id })}
          reactivatePendingId={pendingId(reactivateMutation)}
          onResetPassword={setResetId}
        />
      </Section>

      <ConfirmDeleteDialog
        {...deactivate.dialogProps}
        title={t("users.deactivateConfirm.title")}
        description={t("users.deactivateConfirm.description")}
        confirmLabel={t("users.deactivate")}
      />

      <ResetPasswordDialog
        user={list.find((user) => user.id === resetId) ?? null}
        onClose={() => setResetId(null)}
      />
    </div>
  );
}
