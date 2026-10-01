import { HandCoins, History, UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useContactsSuspense, useDeleteContact } from "@/api/generated";
import type { ContactBalanceResponse, ContactResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { EditModal, Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RecordRowsSkeleton } from "@/components/record-row/record-row";
import { type DeleteProps, RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { ContactEntries } from "@/features/households/contact-entries/contact-entries";
import { ContactForm } from "@/features/households/contact-form/contact-form";
import { ContactPaymentForm } from "@/features/households/contact-payment-form/contact-payment-form";
import { useEditableList } from "@/hooks/use-editable-list";
import { useMoney } from "@/hooks/use-formatters";

interface RowProps extends DeleteProps {
  contact: ContactResponse;
  onEdit: () => void;
  onRecord: () => void;
}

function useBalanceText() {
  const { t } = useTranslation();
  const money = useMoney();

  return function balanceText(balance: ContactBalanceResponse) {
    const amount = money.format(Math.abs(Number(balance.amount)), balance.currency);
    return Number(balance.amount) > 0
      ? t("households.people.owesYou", { amount })
      : t("households.people.youOwe", { amount });
  };
}

function PersonRow({ contact, onEdit, onRecord, ...deleteProps }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const balanceText = useBalanceText();
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <RowTransition>
      <li className="py-2.5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium wrap-break-word">{contact.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {contact.balances.length === 0
                ? t("households.people.even")
                : contact.balances.map(balanceText).join(" · ")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <Button variant="outline" size="sm" onClick={onRecord}>
              <HandCoins />
              {t("households.people.record")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-expanded={historyOpen}
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <History />
              {historyOpen
                ? t("households.people.hideHistory")
                : t("households.people.showHistory")}
            </Button>
            <RowActions label={contact.name} onEdit={onEdit} {...deleteProps} />
          </div>
        </div>
        {historyOpen ? (
          <div className="pt-2">
            <QueryBoundary fallback={<RecordRowsSkeleton rows={2} />}>
              <ContactEntries contact={contact} />
            </QueryBoundary>
          </div>
        ) : null}
      </li>
    </RowTransition>
  );
}

export function PeopleSkeleton() {
  return (
    <Section aria-hidden="true">
      <TextSkeleton size="title" width="w-24" />
      <RecordRowsSkeleton rows={2} />
    </Section>
  );
}

export function PeopleSection() {
  const { t } = useTranslation();
  const contacts = useContactsSuspense().data;
  const people = useEditableList(
    contacts,
    useDeleteContact(),
    (contact) => contact.name,
    "contact",
  );
  const [recording, setRecording] = useState<ContactResponse | null>(null);

  return (
    <Section>
      <SectionHeader title={t("households.people.title")}>
        <CreateDialog
          secondary
          icon={UserPlus}
          label={t("households.people.add")}
          title={t("households.people.add")}
        >
          {(close) => <ContactForm onClose={close} />}
        </CreateDialog>
      </SectionHeader>
      <p className="mb-2 max-w-prose text-sm text-muted-foreground">
        {t("households.people.description")}
      </p>

      {people.list.length === 0 ? (
        <EmptyText>{t("households.people.empty")}</EmptyText>
      ) : (
        <Rows>
          {people.list.map((contact) => (
            <PersonRow
              key={contact.id}
              contact={contact}
              onRecord={() => setRecording(contact)}
              {...people.rowProps(contact)}
            />
          ))}
        </Rows>
      )}

      <EditModal {...people.editProps} title={t("households.people.rename")}>
        {(contact, close) => <ContactForm initial={contact} onClose={close} />}
      </EditModal>
      <Modal
        open={recording !== null}
        onOpenChange={(open) => setRecording(open ? recording : null)}
        title={t("households.people.payment.title", { name: recording?.name ?? "" })}
      >
        {recording ? (
          <ContactPaymentForm contact={recording} onClose={() => setRecording(null)} />
        ) : null}
      </Modal>
      <ConfirmDeleteDialog {...people.dialogProps} />
    </Section>
  );
}
