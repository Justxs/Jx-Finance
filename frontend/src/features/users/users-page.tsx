import { useQueryClient } from "@tanstack/react-query";
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
import { CreateUserForm } from "./create-user-form";
import { UsersTable } from "./users-table";

export function UsersPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

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
    <div className="space-y-8">
      <PageHeader title={t("users.title")} subtitle={t("users.subtitle")} />

      <section className="card p-6">
        <h2 className="mb-5 font-semibold">{t("users.add")}</h2>
        <CreateUserForm onCreated={invalidate} />
      </section>

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
