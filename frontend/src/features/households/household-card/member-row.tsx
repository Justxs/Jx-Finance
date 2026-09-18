import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useUpdateMemberRoleEndpoint } from "@/api/generated";
import type { HouseholdMemberResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/select-field";

interface Props {
  householdId: string;
  member: HouseholdMemberResponse;
  isOwnerView: boolean;
  onRemove: () => void;
  removePending: boolean;
  removeDisabled: boolean;
  onSaved: () => void;
}

export function MemberRow({
  householdId,
  member,
  isOwnerView,
  onRemove,
  removePending,
  removeDisabled,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const roleMutation = useUpdateMemberRoleEndpoint({ mutation: { onSettled: onSaved } });

  return (
    <li className="flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 break-words">
        <p className="text-sm font-medium">{member.displayName}</p>
        <p className="text-xs text-muted-foreground">{member.email}</p>
      </div>
      {isOwnerView ? (
        <div className="flex items-center gap-2">
          <div aria-busy={roleMutation.isPending}>
            <SelectField
              value={member.role}
              className={roleMutation.isPending ? "w-auto is-stale" : "w-auto"}
              disabled={roleMutation.isPending}
              onChange={(role) =>
                roleMutation.mutate({
                  id: householdId,
                  userId: member.userId!,
                  data: { role },
                })
              }
              options={[
                { value: "owner", label: t("households.roles.owner") },
                { value: "member", label: t("households.roles.member") },
              ]}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            pending={removePending}
            disabled={removeDisabled}
            onClick={onRemove}
            aria-label={t("actions.delete")}
            title={t("actions.delete")}
          >
            <Trash2 />
          </Button>
        </div>
      ) : (
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {t(`households.roles.${member.role}`)}
        </span>
      )}
    </li>
  );
}
