import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteHousehold, useRemoveMember } from "@/api/generated";
import type { HouseholdResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { CreateHouseholdForm } from "../create-household-form";
import { AddMemberForm } from "./add-member-form";
import { MemberRow } from "./member-row";

interface Props {
  household: HouseholdResponse;
}

export function HouseholdCard({ household }: Readonly<Props>) {
  const members = useDeferredValue(household.members);
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const isOwner = household.myRole === "owner";

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteHousehold();
  const removeMutation = useRemoveMember();

  return (
    <section className="section">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title min-w-0 wrap-break-word">{household.name}</h2>

        {isOwner ? (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => setRenaming(true)}
              aria-label={`${t("actions.edit")}: ${household.name}`}
              tooltip={`${t("actions.edit")}: ${household.name}`}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              pending={deleteMutation.isPending}
              onClick={() => setDeleteTarget(household.id)}
              aria-label={`${t("actions.delete")}: ${household.name}`}
              tooltip={`${t("actions.delete")}: ${household.name}`}
            >
              <Trash2 />
            </Button>
          </div>
        ) : null}
      </div>

      <Modal open={renaming} onOpenChange={setRenaming} title={t("actions.edit")}>
        <CreateHouseholdForm
          initial={household}
          onCreated={() => setRenaming(false)}
          onCancel={() => setRenaming(false)}
        />
      </Modal>

      <ul className="rows">
        {members?.map((member) => (
          <MemberRow
            key={member.userId}
            householdId={household.id}
            member={member}
            isOwnerView={isOwner}
            removePending={
              removeMutation.isPending && removeMutation.variables?.userId === member.userId
            }
            removeDisabled={removeMutation.isPending}
            onRemove={() => removeMutation.mutate({ id: household.id, userId: member.userId })}
          />
        ))}
      </ul>

      {isOwner ? (
        <div className="flex justify-end pt-3">
          <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(true)}>
            <Plus />
            {t("households.addMember")}
          </Button>
        </div>
      ) : null}

      <Modal open={addMemberOpen} onOpenChange={setAddMemberOpen} title={t("households.addMember")}>
        <AddMemberForm
          householdId={household.id}
          onAdded={() => setAddMemberOpen(false)}
          onCancel={() => setAddMemberOpen(false)}
        />
      </Modal>
      <ConfirmDeleteDialog
        target={deleteTarget}
        itemLabel={household.name ?? undefined}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </section>
  );
}
