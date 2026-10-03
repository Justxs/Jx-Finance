import { useNavigate, useSearch } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getRecurringBillsQueryKey,
  useDeleteRecurringBill,
  useAccountsSuspense,
  useCategoriesSuspense,
  useRecurringBillsSuspense,
  useRecurringTotalsSuspense,
  useSkipRecurringBill,
  useSubscriptionCandidatesSuspense,
  useUpdateRecurringBill,
} from "@/api/generated";
import type { RecurringBillResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { Disclosure } from "@/components/disclosure/disclosure";
import { EditModal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import { SegmentedControl } from "@/components/ui/segmented-control/segmented-control";
import { CashFlowForecast } from "@/features/accounts/cash-flow-forecast/cash-flow-forecast";
import { billUrgencies, groupBills } from "@/features/recurring-bills/bill-groups";
import { BillsCalendar } from "@/features/recurring-bills/bills-calendar/bills-calendar";
import { RecurringBillConfirmForm } from "@/features/recurring-bills/recurring-bill-confirm-form/recurring-bill-confirm-form";
import { RecurringBillForm } from "@/features/recurring-bills/recurring-bill-form/recurring-bill-form";
import { RecurringBillRow } from "@/features/recurring-bills/recurring-bill-row/recurring-bill-row";
import { RecurringTotals } from "@/features/recurring-bills/recurring-totals/recurring-totals";
import { SubscriptionSuggestions } from "@/features/recurring-bills/subscription-suggestions/subscription-suggestions";
import { useEditableList } from "@/hooks/use-editable-list";
import { useFeature, useToday } from "@/hooks/use-settings";
import { notify, pendingId } from "@/lib/mutations";
import { optimisticRemoval } from "@/lib/optimistic";
import { byId, nameById } from "@/lib/options";

type BillsView = "list" | "calendar";

export function RecurringBillsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/recurring-bills" });
  const view: BillsView = useSearch({ from: "/recurring-bills" }).view ?? "list";
  const [confirming, setConfirming] = useState<RecurringBillResponse | null>(null);
  const forecastEnabled = useFeature("cashFlowForecast");

  const accounts = useAccountsSuspense();
  const categories = useCategoriesSuspense();
  const candidates = useSubscriptionCandidatesSuspense();
  const totals = useRecurringTotalsSuspense().data;

  const bills = useEditableList(
    useRecurringBillsSuspense().data,
    useDeleteRecurringBill({
      mutation: optimisticRemoval<RecurringBillResponse>(getRecurringBillsQueryKey()),
    }),
    (bill) => bill.name,
    "recurringBill",
  );
  const updateMutation = useUpdateRecurringBill({
    mutation: notify(t("recurringBills.expectedUpdated")),
  });

  const skipMutation = useSkipRecurringBill({ mutation: notify(t("recurringBills.markedDone")) });

  function markDone(billId: string, expectedDueDate: string, transactionId: string | null = null) {
    skipMutation.mutate({ id: billId, data: { expectedDueDate, transactionId } });
  }

  function updateExpected(bill: RecurringBillResponse, amount: string) {
    updateMutation.mutate({
      id: bill.id,
      data: {
        name: bill.name,
        shape: bill.shape,
        kind: bill.kind,
        amount,
        categoryId: bill.categoryId,
        accountId: bill.accountId,
        toAccountId: bill.toAccountId,
        cadence: bill.cadence,
        nextDueDate: bill.nextDueDate,
        remindDaysBefore: bill.remindDaysBefore,
        isActive: bill.isActive,
        matchKey: bill.matchKey,
        debtId: bill.debtId,
        scope: bill.scope,
        householdId: bill.householdId,
        spreadMonths: bill.spreadMonths,
        spreadDirection: bill.spreadDirection,
      },
    });
  }

  const accountList = accounts.data;
  const categoryList = categories.data;
  const accountById = byId(accountList);
  const categoryNames = nameById(categoryList);
  const billList = bills.list;
  const candidateList = useDeferredValue(candidates.data);
  const today = useToday();
  const { groups, inactive } = groupBills(billList, today);
  const possiblyCancelled = new Set(totals.possiblyCancelled);
  const hasTotals = billList.some((bill) => bill.isActive && bill.shape !== "transfer");

  function billRow(bill: RecurringBillResponse) {
    return (
      <RecurringBillRow
        key={bill.id}
        bill={bill}
        accountById={accountById}
        categoryNames={categoryNames}
        onConfirm={() => setConfirming(bill)}
        possiblyCancelled={possiblyCancelled.has(bill.id)}
        onMarkDone={() => markDone(bill.id, bill.nextDueDate)}
        markDonePending={pendingId(skipMutation) === bill.id}
        onUpdateAmount={(amount) => updateExpected(bill, amount)}
        updatePending={pendingId(updateMutation) === bill.id}
        {...bills.rowProps(bill)}
      />
    );
  }

  function chooseView(next: BillsView) {
    void navigate({
      search: (previous) => ({ ...previous, view: next === "list" ? undefined : next }),
    });
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("recurringBills.title")}>
        <SegmentedControl
          aria-label={t("recurringBills.calendar.view")}
          value={view}
          onChange={chooseView}
          options={[
            { value: "list", label: t("recurringBills.calendar.list") },
            { value: "calendar", label: t("recurringBills.calendar.calendar") },
          ]}
        />
        <CreateDialog label={t("recurringBills.add")} title={t("recurringBills.add")}>
          {(close) => (
            <RecurringBillForm accounts={accountList} categories={categoryList} onClose={close} />
          )}
        </CreateDialog>
      </PageHeader>

      {view === "calendar" ? (
        <BillsCalendar
          onConfirm={setConfirming}
          onEdit={(bill) => bills.rowProps(bill).onEdit()}
          onMarkDone={(occurrence) =>
            markDone(occurrence.billId, occurrence.date, occurrence.transactionId)
          }
          markingDone={pendingId(skipMutation)}
        />
      ) : null}
      {view === "list" && hasTotals ? <RecurringTotals totals={totals} /> : null}
      {view === "list" && forecastEnabled && billList.length > 0 ? (
        <CashFlowForecast totals />
      ) : null}
      {view === "list" && billList.length === 0 ? (
        <EmptyText>{t("recurringBills.empty")}</EmptyText>
      ) : null}
      {view === "list" && billList.length > inactive.length ? (
        <Section className="space-y-4">
          {billUrgencies.map((urgency) =>
            groups[urgency].length > 0 ? (
              <div key={urgency}>
                <h2 id={`bills-${urgency}`} className="text-sm font-semibold text-muted-foreground">
                  {t(`recurringBills.groups.${urgency}`)}
                </h2>
                <Rows aria-labelledby={`bills-${urgency}`}>{groups[urgency].map(billRow)}</Rows>
              </div>
            ) : null,
          )}
        </Section>
      ) : null}
      {view === "list" && inactive.length > 0 ? (
        <Section>
          <Disclosure summary={t("recurringBills.groups.inactive", { count: inactive.length })}>
            <Rows>{inactive.map(billRow)}</Rows>
          </Disclosure>
        </Section>
      ) : null}
      <SubscriptionSuggestions
        candidates={candidateList}
        accounts={accountList}
        categories={categoryList}
      />
      <EditModal
        {...bills.editProps}
        title={(bill) => `${t("recurringBills.editTitle")}: ${bill.name}`}
      >
        {(bill, close) => (
          <RecurringBillForm
            initial={bill}
            accounts={accountList}
            categories={categoryList}
            onClose={close}
          />
        )}
      </EditModal>
      <EditModal
        item={confirming}
        onClose={() => setConfirming(null)}
        title={t("recurringBills.confirmTitle")}
      >
        {(bill, close) => (
          <RecurringBillConfirmForm bill={bill} accounts={accountList} onClose={close} />
        )}
      </EditModal>
      <ConfirmDeleteDialog {...bills.dialogProps} />
    </div>
  );
}
