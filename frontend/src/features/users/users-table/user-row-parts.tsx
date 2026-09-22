import { KeyRound, UserCheck, UserX } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UserProfileResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { Tag } from "@/components/ui/tag/tag";
import { roleOptions, userName } from "../user-queries";

export interface UserRowControls {
  currentUserId: string | undefined;
  onRoleChange: (id: string, role: string) => void;
  rolePendingId: string | null;
  onDeactivate: (id: string) => void;
  deactivatePendingId: string | null;
  onReactivate: (id: string) => void;
  reactivatePendingId: string | null;
  onResetPassword: (id: string) => void;
}

interface UserProps {
  user: UserProfileResponse;
}

interface ControlledUserProps extends UserProps {
  controls: UserRowControls;
}

export function UserRoleSelect({ user, controls }: Readonly<ControlledUserProps>) {
  const { t } = useTranslation();
  const { currentUserId, rolePendingId, onRoleChange } = controls;
  const isSelf = user.id === currentUserId;

  return (
    <SelectField
      aria-label={`${t("users.role")}: ${userName(user)}`}
      value={user.role}
      className={rolePendingId === user.id ? "stale" : undefined}
      aria-busy={rolePendingId === user.id}
      disabled={isSelf || rolePendingId !== null}
      onChange={(role) => onRoleChange(user.id, role)}
      options={roleOptions(t)}
    />
  );
}

export function UserStatusTag({ user }: Readonly<UserProps>) {
  const { t } = useTranslation();

  return (
    <Tag tone={user.isActive ? "neutral" : "negative"}>
      {user.isActive ? t("users.active") : t("users.deactivated")}
    </Tag>
  );
}

export function UserRowActions({ user, controls }: Readonly<ControlledUserProps>) {
  const { t } = useTranslation();
  const {
    currentUserId,
    deactivatePendingId,
    reactivatePendingId,
    onDeactivate,
    onReactivate,
    onResetPassword,
  } = controls;

  if (user.id === currentUserId) {
    return null;
  }
  const name = userName(user);
  const busy = deactivatePendingId !== null || reactivatePendingId !== null;
  const resetLabel = `${t("users.resetPassword.action")}: ${name}`;
  const statusLabel = `${t(user.isActive ? "users.deactivate" : "users.reactivate")}: ${name}`;

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onResetPassword(user.id)}
        aria-label={resetLabel}
      >
        <KeyRound />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        pending={(user.isActive ? deactivatePendingId : reactivatePendingId) === user.id}
        disabled={busy}
        onClick={() => (user.isActive ? onDeactivate(user.id) : onReactivate(user.id))}
        aria-label={statusLabel}
      >
        {user.isActive ? <UserX /> : <UserCheck />}
      </Button>
    </>
  );
}
