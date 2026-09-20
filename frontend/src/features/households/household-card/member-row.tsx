import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUpdateMemberRole } from "@/api/generated";
import type { HouseholdMemberResponse } from "@/api/generated/model";
import { RowTransition } from "@/components/row-transition";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { staleVariants } from "@/components/ui/stale-region";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

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
              aria-label={`${t("users.role")}: ${member.displayName || member.email}`}
              aria-busy={roleMutation.isPending}
              value={member.role}
              className={cn("w-auto", staleVariants({ stale: roleMutation.isPending }))}
              disabled={roleMutation.isPending}
              onChange={(role) =>
                roleMutation.mutate({
                  id: householdId,
                  userId: member.userId,
                  data: { role },
                })
              }
              options={[
                { value: "owner", label: t("households.roles.owner") },
                { value: "member", label: t("households.roles.member") },
              ]}
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              pending={removePending}
              disabled={removeDisabled}
              onClick={onRemove}
              aria-label={`${t("actions.delete")}: ${member.displayName || member.email}`}
              tooltip={`${t("actions.delete")}: ${member.displayName || member.email}`}
            >
              <Trash2 />
            </Button>
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
