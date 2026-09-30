import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useDeactivateUser,
  useMeSuspense,
  useReactivateUser,
  useUpdateUserRole,
} from "@/api/generated";
import type { UserProfileResponse } from "@/api/generated/model";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { notify, pendingId } from "@/lib/mutations";
import { userName } from "@/lib/user-name";
import type { UserRowControls } from "./user-row-parts";

export function useUserRowControls(users: UserProfileResponse[]) {
  const { t } = useTranslation();
  const currentUserId = useMeSuspense().data.id;
  const [resetId, setResetId] = useState<string | null>(null);

  const roleMutation = useUpdateUserRole({ mutation: notify(t("users.roleUpdated")) });
  const reactivateMutation = useReactivateUser({ mutation: notify(t("users.reactivated_toast")) });
  const deactivate = useConfirmedDelete(
    useDeactivateUser({ mutation: notify(t("users.deactivated_toast")) }),
    users,
    userName,
  );

  const controls: UserRowControls = {
    currentUserId,
    onRoleChange: (id, role) => roleMutation.mutate({ id, data: { role } }),
    rolePendingId: pendingId(roleMutation),
    onDeactivate: deactivate.request,
    deactivatePendingId: deactivate.pendingId,
    onReactivate: (id) => reactivateMutation.mutate({ id }),
    reactivatePendingId: pendingId(reactivateMutation),
    onResetPassword: setResetId,
  };

  return {
    controls,
    deactivateDialogProps: deactivate.dialogProps,
    resetUser: users.find((user) => user.id === resetId) ?? null,
    closeReset: () => setResetId(null),
  };
}
