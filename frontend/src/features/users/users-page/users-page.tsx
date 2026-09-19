import { useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useDeactivateUser,
  useGetUsersSuspense,
  useMeSuspense,
  useUpdateUserRole,
} from "@/api/generated";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { CreateUserForm } from "../create-user-form";
import { UsersTable } from "../users-table";

export function UsersPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);

  const me = useMeSuspense();
  const [shown, stale] = useDeferredParams(useSearch({ from: "/users" }));
  const users = useGetUsersSuspense({
    search: shown.search,
    role: shown.role,
    isActive: shown.isActive,
    sort: shown.sort,
    direction: shown.direction,
  });

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

  return (
    <div className="space-y-10">
      <PageHeader title={t("users.title")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("users.add")}
        </Button>
      </PageHeader>

      <Modal open={addOpen} onOpenChange={setAddOpen} title={t("users.add")}>
        <CreateUserForm onCreated={() => setAddOpen(false)} onCancel={() => setAddOpen(false)} />
      </Modal>

      <UsersTable
        users={users.data ?? []}
        stale={stale}
        currentUserId={me.data?.id}
        onRoleChange={(id, role) => roleMutation.mutate({ id, data: { role } })}
        rolePendingId={roleMutation.isPending ? (roleMutation.variables?.id ?? null) : null}
        onDeactivate={(id) => deactivateMutation.mutate({ id })}
        deactivatePendingId={
          deactivateMutation.isPending ? (deactivateMutation.variables?.id ?? null) : null
        }
      />
    </div>
  );
}
