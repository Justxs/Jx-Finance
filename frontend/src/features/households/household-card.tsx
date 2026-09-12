import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useDeleteHouseholdEndpoint,
  useRemoveMemberEndpoint,
  useUpdateHouseholdEndpoint,
} from "@/api/generated";
import type { HouseholdResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const isOwner = household.myRole === "owner";

  const renameMutation = useUpdateHouseholdEndpoint({
    mutation: { onSuccess: () => setRenaming(false), onSettled: onChanged },
  });
  const deleteMutation = useDeleteHouseholdEndpoint({ mutation: { onSettled: onChanged } });
  const removeMutation = useRemoveMemberEndpoint({ mutation: { onSettled: onChanged } });

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-6">
        <h2 className="min-w-0 wrap-break-word font-semibold">{household.name}</h2>

        {isOwner ? (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setRenaming(true)}
              aria-label={t("actions.edit")}
              title={t("actions.edit")}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              pending={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ id: household.id! })}
              aria-label={t("actions.delete")}
              title={t("actions.delete")}
            >
              <Trash2 />
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={renaming} onOpenChange={setRenaming} title={t("actions.edit")}>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={`household-${household.id}-name`}>
              {t("households.namePlaceholder")}
            </Label>
            <Input
              id={`household-${household.id}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={renameMutation.isPending}
              onClick={() => setRenaming(false)}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              pending={renameMutation.isPending}
              disabled={!name.trim()}
              onClick={() =>
                renameMutation.mutate({ id: household.id!, data: { name: name.trim() } })
              }
            >
              {t("actions.save")}
            </Button>
          </div>
        </div>
      </Dialog>

      <ul className="divide-y divide-border px-6">
        {household.members?.map((member) => (
          <MemberRow
            key={member.userId}
            householdId={household.id!}
            member={member}
            isOwnerView={isOwner}
            removePending={
              removeMutation.isPending && removeMutation.variables?.userId === member.userId
            }
            removeDisabled={removeMutation.isPending}
            onRemove={() => removeMutation.mutate({ id: household.id!, userId: member.userId! })}
            onSaved={onChanged}
          />
        ))}
      </ul>

      {isOwner ? (
        <div className="flex justify-end border-t px-6 py-3">
          <Button size="sm" onClick={() => setAddMemberOpen(true)}>
            <Plus />
            {t("households.addMember")}
          </Button>
        </div>
      ) : null}

      <Dialog
        open={addMemberOpen}
        onOpenChange={setAddMemberOpen}
        title={t("households.addMember")}
      >
        <AddMemberForm
          householdId={household.id!}
          onAdded={() => {
            onChanged();
            setAddMemberOpen(false);
          }}
          onCancel={() => setAddMemberOpen(false)}
        />
      </Dialog>
    </section>
  );
}
