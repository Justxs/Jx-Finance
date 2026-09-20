import { useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useDeactivateUser,
  useReactivateUser,
  useUsersSuspense,
  useMeSuspense,
  useUpdateUserRole,
} from "@/api/generated";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/section";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { CreateUserForm } from "../create-user-form";
import { ResetPasswordDialog } from "../reset-password-dialog";
import { userListParams } from "../user-queries";
import { UsersTable } from "../users-table";

export function UsersPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);

  const me = useMeSuspense();
  const [shown, stale] = useDeferredParams(useSearch({ from: "/users" }));
  const users = useUsersSuspense(userListParams(shown));

  const roleMutation = useUpdateUserRole({
    mutation: {
      onSuccess: () => toast.success(t("users.roleUpdated")),
    },
  });
  const deactivateMutation = useDeactivateUser({
    mutation: {
      onSuccess: () => toast.success(t("users.deactivated_toast")),
    },
  });
  const reactivateMutation = useReactivateUser({
    mutation: {
      onSuccess: () => toast.success(t("users.reactivated_toast")),
    },
  });

  const list = users.data ?? [];
  const deactivateTarget = list.find((user) => user.id === deactivateId);

  return (
    <div className="space-y-5">
      <PageHeader title={t("users.title")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("users.add")}
        </Button>
      </PageHeader>

      <Modal open={addOpen} onOpenChange={setAddOpen} title={t("users.add")}>
        <CreateUserForm onCreated={() => setAddOpen(false)} onCancel={() => setAddOpen(false)} />
      </Modal>

      <Panel>
        <UsersTable
          users={list}
          stale={stale}
          currentUserId={me.data?.id}
          onRoleChange={(id, role) => roleMutation.mutate({ id, data: { role } })}
          rolePendingId={roleMutation.isPending ? (roleMutation.variables?.id ?? null) : null}
          onDeactivate={setDeactivateId}
          deactivatePendingId={
            deactivateMutation.isPending ? (deactivateMutation.variables?.id ?? null) : null
          }
          onReactivate={(id) => reactivateMutation.mutate({ id })}
          reactivatePendingId={
            reactivateMutation.isPending ? (reactivateMutation.variables?.id ?? null) : null
          }
          onResetPassword={setResetId}
        />
      </Panel>

      <ConfirmDeleteDialog
        target={deactivateId}
        itemLabel={deactivateTarget?.displayName || deactivateTarget?.email}
        title={t("users.deactivateConfirm.title")}
        description={t("users.deactivateConfirm.description")}
        confirmLabel={t("users.deactivate")}
        onCancel={() => setDeactivateId(null)}
        onConfirm={(id) => deactivateMutation.mutate({ id })}
      />

      <ResetPasswordDialog
        user={list.find((user) => user.id === resetId) ?? null}
        onClose={() => setResetId(null)}
      />
    </div>
  );
}
