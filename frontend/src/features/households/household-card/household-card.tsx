import { History, ReceiptText } from "lucide-react";
import { useState, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteHousehold, useRemoveMember } from "@/api/generated";
import type { HouseholdResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RowActions } from "@/components/row-actions/row-actions";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import { CreateHouseholdForm } from "@/features/households/create-household-form/create-household-form";
import { HouseholdActivity } from "@/features/households/household-activity/household-activity";
import { SettleUpSection, SettleUpSkeleton } from "@/features/households/settle-up/settle-up";
import { SharedExpenses } from "@/features/households/shared-expenses/shared-expenses";
import { childDelete, useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { userName } from "@/lib/user-name";
import { useActiveHouseholdId } from "@/stores/active-household-store";
import { AddMemberForm } from "./add-member-form";
import { MemberRow } from "./member-row";

interface Props {
  household: HouseholdResponse;
}

export function HouseholdCard({ household }: Readonly<Props>) {
  const members = useDeferredValue(household.members);
  const { t } = useTranslation();
  const [renaming, setRenaming] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [sharedOpen, setSharedOpen] = useState(false);
  const activeHouseholdId = useActiveHouseholdId();
  const activityVisible = !activeHouseholdId || activeHouseholdId === household.id;

  const isOwner = household.myRole === "owner";

  const deleteMutation = useDeleteHousehold();
  const remove = useConfirmedDelete(deleteMutation, [household], (item) => item.name, "household");
  const removeMember = useConfirmedDelete(
    childDelete(
      useRemoveMember(),
      (userId) => ({ id: household.id, userId }),
      (variables) => variables.userId,
    ),
    members.map((member) => ({ ...member, id: member.userId })),
    userName,
  );

  return (
    <Section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <h3 className="min-w-0 text-lg leading-6 font-semibold wrap-break-word">
          {household.name}
        </h3>
        {isOwner ? (
          <RowActions
            label={household.name}
            onEdit={() => setRenaming(true)}
            {...remove.deleteProps(household.id)}
          />
        ) : null}
      </div>

      <Modal
        open={renaming}
        onOpenChange={setRenaming}
        title={`${t("actions.edit")}: ${household.name}`}
      >
        <CreateHouseholdForm initial={household} onClose={() => setRenaming(false)} />
      </Modal>

      <Rows>
        {members.map((member) => (
          <MemberRow
            key={member.userId}
            householdId={household.id}
            member={member}
            isOwnerView={isOwner}
            removePending={removeMember.pendingId === member.userId}
            removeDisabled={removeMember.busy}
            onRemove={() => removeMember.request(member.userId)}
          />
        ))}
      </Rows>

      {activityVisible ? (
        <div className="pt-4">
          <QueryBoundary fallback={<SettleUpSkeleton />}>
            <SettleUpSection household={household} />
          </QueryBoundary>
        </div>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2 pt-3">
        {activityVisible ? (
          <Button
            variant="outline"
            size="sm"
            aria-expanded={sharedOpen}
            onClick={() => setSharedOpen(!sharedOpen)}
          >
            <ReceiptText />
            {sharedOpen ? t("households.settleUp.hideShared") : t("households.settleUp.showShared")}
          </Button>
        ) : null}
        {activityVisible ? (
          <Button
            variant="outline"
            size="sm"
            aria-expanded={activityOpen}
            onClick={() => setActivityOpen(!activityOpen)}
          >
            <History />
            {activityOpen ? t("audit.hide") : t("audit.show")}
          </Button>
        ) : null}
        {isOwner ? (
          <CreateDialog
            secondary
            label={t("households.addMember")}
            title={t("households.addMember")}
          >
            {(close) => <AddMemberForm householdId={household.id} onClose={close} />}
          </CreateDialog>
        ) : null}
      </div>

      {activityVisible && sharedOpen ? (
        <div className="pt-4">
          <SharedExpenses householdId={household.id} />
        </div>
      ) : null}

      {activityVisible && activityOpen ? (
        <div className="pt-4">
          <HouseholdActivity householdId={household.id} members={household.members} />
        </div>
      ) : null}

      <ConfirmDeleteDialog {...remove.dialogProps} />
      <ConfirmDeleteDialog
        {...removeMember.dialogProps}
        title={t("households.removeMember.title")}
        description={t("households.removeMember.description")}
        confirmLabel={t("households.removeMember.confirm")}
      />
    </Section>
  );
}
