import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGetUsersEndpointQueryKey,
  useDeactivateUserEndpoint,
  useGetUsersEndpointSuspense,
  useMeEndpointSuspense,
  useUpdateUserRoleEndpoint,
} from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CreateUserForm } from "./create-user-form";
import { UsersTable } from "./users-table";

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const me = useMeEndpointSuspense();
  const [shown, stale] = useDeferredParams(useSearch({ from: "/users" }));
  const users = useGetUsersEndpointSuspense({
    search: shown.search,
    role: shown.role,
    isActive: shown.isActive,
    sort: shown.sort,
    direction: shown.direction,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetUsersEndpointQueryKey() });
  }

  const roleMutation = useUpdateUserRoleEndpoint({
    mutation: {
      onSuccess: () => toast.success(t("users.roleUpdated")),
      onSettled: invalidate,
    },
  });
  const deactivateMutation = useDeactivateUserEndpoint({
    mutation: {
      onSuccess: () => toast.success(t("users.deactivated_toast")),
      onSettled: invalidate,
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("users.title")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("users.add")}
        </Button>
      </PageHeader>

      <Dialog open={addOpen} onOpenChange={setAddOpen} title={t("users.add")}>
        <CreateUserForm
          onCreated={() => {
            invalidate();
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>

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
