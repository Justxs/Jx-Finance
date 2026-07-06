import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteHouseholdEndpoint, useRemoveMemberEndpoint, useUpdateHouseholdEndpoint } from "@/api/generated";
import type { HouseholdResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddMemberForm } from "./add-member-form";
import { MemberRow } from "./member-row";

interface Props {
  household: HouseholdResponse;
  onChanged: () => void;
}

export function HouseholdCard({ household, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(household.name ?? "");

  const isOwner = household.myRole === "owner";

  const renameMutation = useUpdateHouseholdEndpoint({
    mutation: { onSuccess: () => setRenaming(false), onSettled: onChanged },
  });
  const deleteMutation = useDeleteHouseholdEndpoint({ mutation: { onSettled: onChanged } });
  const removeMutation = useRemoveMemberEndpoint({ mutation: { onSettled: onChanged } });

  return (
    <section className="card">
      <div className="flex items-center justify-between gap-3 border-b p-6">
        {renaming ? (
          <div className="flex items-center gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            <Button
              size="sm"
              disabled={renameMutation.isPending || !name.trim()}
              onClick={() => renameMutation.mutate({ id: household.id!, data: { name: name.trim() } })}
            >
              {t("actions.save")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setRenaming(false)}>
              {t("actions.cancel")}
            </Button>
          </div>
        ) : (
          <h2 className="font-semibold">{household.name}</h2>
        )}

        {isOwner && !renaming ? (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRenaming(true)}>
              {t("actions.edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: household.id! })}
            >
              {t("actions.delete")}
            </Button>
          </div>
        ) : null}
      </div>

      <ul className="divide-y divide-border px-6">
        {household.members?.map((member) => (
          <MemberRow
            key={member.userId}
            householdId={household.id!}
            member={member}
            isOwnerView={isOwner}
            removePending={removeMutation.isPending}
            onRemove={() => removeMutation.mutate({ id: household.id!, userId: member.userId! })}
            onSaved={onChanged}
          />
        ))}
      </ul>

      {isOwner ? (
        <div className="border-t p-6">
          <AddMemberForm householdId={household.id!} onAdded={onChanged} />
        </div>
      ) : null}
    </section>
  );
}
