import { History, Plus } from "lucide-react";
import { useState, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteHousehold, useRemoveMember } from "@/api/generated";
import type { HouseholdResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { RowActions } from "@/components/row-actions/row-actions";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useActiveHouseholdId } from "@/stores/active-household-store";
import { CreateHouseholdForm } from "../create-household-form/create-household-form";
import { HouseholdActivity } from "../household-activity/household-activity";
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
  const [activityOpen, setActivityOpen] = useState(false);
  const activeHouseholdId = useActiveHouseholdId();
  const activityVisible = !activeHouseholdId || activeHouseholdId === household.id;

  const isOwner = household.myRole === "owner";

  const deleteMutation = useDeleteHousehold();
  const remove = useConfirmedDelete(deleteMutation, [household], (item) => item.name, "household");
  const removeMutation = useRemoveMember();

  return (
    <Section>
      <SectionHeader title={household.name} titleClassName="min-w-0 wrap-break-word">
        {isOwner ? (
          <RowActions
            label={household.name}
            onEdit={() => setRenaming(true)}
            {...remove.deleteProps(household.id)}
          />
        ) : null}
      </SectionHeader>

      <Modal open={renaming} onOpenChange={setRenaming} title={t("actions.edit")}>
        <CreateHouseholdForm initial={household} onClose={() => setRenaming(false)} />
      </Modal>

      <Rows>
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
      </Rows>

      <div className="flex flex-wrap justify-end gap-2 pt-3">
        {activityVisible ? (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={activityOpen}
            onClick={() => setActivityOpen(!activityOpen)}
          >
            <History />
            {activityOpen ? t("audit.hide") : t("audit.show")}
          </Button>
        ) : null}
        {isOwner ? (
          <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(true)}>
            <Plus />
            {t("households.addMember")}
          </Button>
        ) : null}
      </div>

      {activityVisible && activityOpen ? (
        <div className="pt-4">
          <HouseholdActivity householdId={household.id} members={household.members} />
        </div>
      ) : null}

      <Modal open={addMemberOpen} onOpenChange={setAddMemberOpen} title={t("households.addMember")}>
        <AddMemberForm householdId={household.id} onClose={() => setAddMemberOpen(false)} />
      </Modal>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </Section>
  );
}
