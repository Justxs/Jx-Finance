import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGetUsersEndpointQueryKey,
  useDeactivateUserEndpoint,
  useGetUsersEndpoint,
  useMeEndpoint,
  useUpdateUserRoleEndpoint,
} from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CreateUserForm } from "./create-user-form";
import { UsersTable } from "./users-table";

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const me = useMeEndpoint();
  const users = useGetUsersEndpoint();

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
      <PageHeader title={t("users.title")} subtitle={t("users.subtitle")}>
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
        isPending={users.isPending}
        currentUserId={me.data?.id}
        onRoleChange={(id, role) => roleMutation.mutate({ id, data: { role } })}
        rolePending={roleMutation.isPending}
        onDeactivate={(id) => deactivateMutation.mutate({ id })}
        deactivatePending={deactivateMutation.isPending}
      />
    </div>
  );
}
