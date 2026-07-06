import { type ReactNode } from "react";
import { UserX } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UserProfileResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const roles = ["Member", "Admin"] as const;

interface Props {
  users: UserProfileResponse[];
  isPending: boolean;
  currentUserId: string | undefined;
  onRoleChange: (id: string, role: string) => void;
  rolePending: boolean;
  onDeactivate: (id: string) => void;
  deactivatePending: boolean;
}

export function UsersTable({
  users,
  isPending,
  currentUserId,
  onRoleChange,
  rolePending,
  onDeactivate,
  deactivatePending,
}: Readonly<Props>) {
  const { t } = useTranslation();

  let body: ReactNode;
  if (isPending) {
    body = Array.from({ length: 3 }, (_, index) => (
      <tr key={index} className="border-b last:border-0">
        <td colSpan={5} className="px-6 py-3.5">
          <Skeleton className="h-4 w-full" />
        </td>
      </tr>
    ));
  } else if (users.length === 0) {
    body = (
      <tr>
        <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
          {t("users.empty")}
        </td>
      </tr>
    );
  } else {
    body = users.map((user) => {
      const isSelf = user.id === currentUserId;
      return (
        <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
          <td className="px-6 py-3">
            <p className="font-medium">{user.displayName}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{user.email}</p>
          </td>
          <td className="px-6 py-3">
            <Select
              value={user.role}
              disabled={isSelf || rolePending}
              onChange={(e) => onRoleChange(user.id!, e.target.value)}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {t(`users.roles.${role}`)}
                </option>
              ))}
            </Select>
          </td>
          <td className="px-6 py-3">
            <span
              className={
                user.isActive
                  ? "inline-flex rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground"
                  : "inline-flex rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive"
              }
            >
              {user.isActive ? t("users.active") : t("users.deactivated")}
            </span>
          </td>
          <td className="px-6 py-3">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={isSelf || !user.isActive || deactivatePending}
                onClick={() => onDeactivate(user.id!)}
                aria-label={t("users.deactivate")}
                title={t("users.deactivate")}
              >
                <UserX />
              </Button>
            </div>
          </td>
        </tr>
      );
    });
  }

  return (
    <section className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left">
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("users.displayName")}
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("users.role")}
            </th>
            <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("users.status")}
            </th>
            <th className="px-6 py-3" />
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </section>
  );
}
