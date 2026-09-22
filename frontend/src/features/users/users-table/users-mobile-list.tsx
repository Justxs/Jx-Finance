import { useTranslation } from "react-i18next";
import type { UserProfileResponse } from "@/api/generated/model";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import {
  type UserRowControls,
  UserRoleSelect,
  UserRowActions,
  UserStatusTag,
} from "./user-row-parts";

interface Props {
  users: UserProfileResponse[];
  stale: boolean;
  filtered: boolean;
  controls: UserRowControls;
}

export function UsersMobileList({ users, stale, filtered, controls }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <StaleRegion stale={stale} className="md:hidden">
      {users.length === 0 ? (
        <EmptyText filtered={filtered}>{t("users.empty")}</EmptyText>
      ) : (
        <Rows aria-label={t("users.title")}>
          {users.map((user) => (
            <li key={user.id} className="space-y-2 py-2.5 text-sm">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium wrap-break-word">{user.displayName}</p>
                  <p className="text-xs wrap-break-word text-muted-foreground">{user.email}</p>
                </div>
                <div className="shrink-0">
                  <UserStatusTag user={user} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <UserRoleSelect user={user} controls={controls} />
                </div>
                <div className="-mr-2 flex shrink-0 gap-1">
                  <UserRowActions user={user} controls={controls} />
                </div>
              </div>
            </li>
          ))}
        </Rows>
      )}
    </StaleRegion>
  );
}
