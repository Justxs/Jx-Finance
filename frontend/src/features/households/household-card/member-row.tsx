import { useTranslation } from "react-i18next";
import { useUpdateMemberRole } from "@/api/generated";
import type { HouseholdMemberResponse } from "@/api/generated/model";
import { RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { SelectField } from "@/components/select-field/select-field";
import { Tag } from "@/components/ui/tag/tag";
import { userName } from "@/features/users/user-queries";
import { cn } from "@/lib/utils";
import { householdRoleOptions } from "../household-roles";

interface Props {
  householdId: string;
  member: HouseholdMemberResponse;
  isOwnerView: boolean;
  onRemove: () => void;
  removePending: boolean;
  removeDisabled: boolean;
}

export function MemberRow({
  householdId,
  member,
  isOwnerView,
  onRemove,
  removePending,
  removeDisabled,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const roleMutation = useUpdateMemberRole();

  return (
    <RowTransition>
      <li className="flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 wrap-break-word">
          <p className="text-sm font-medium">{member.displayName}</p>
          <p className="text-xs text-muted-foreground">{member.email}</p>
        </div>
        {isOwnerView ? (
          <div className="flex items-center gap-2">
            <SelectField
              aria-label={`${t("users.role")}: ${userName(member)}`}
              aria-busy={roleMutation.isPending}
              value={member.role}
              className={cn("w-auto", roleMutation.isPending && "stale")}
              disabled={roleMutation.isPending}
              onChange={(role) =>
                roleMutation.mutate({
                  id: householdId,
                  userId: member.userId,
                  data: { role },
                })
              }
              options={householdRoleOptions(t, ["owner", "member"])}
            />
            <RowActions
              label={userName(member)}
              onDelete={onRemove}
              deletePending={removePending}
              deleteDisabled={removeDisabled}
            />
          </div>
        ) : (
          <Tag
            tone={member.role === "owner" ? "accent" : "neutral"}
            className="self-start sm:self-auto"
          >
            {t(`households.roles.${member.role}`)}
          </Tag>
        )}
      </li>
    </RowTransition>
  );
}
