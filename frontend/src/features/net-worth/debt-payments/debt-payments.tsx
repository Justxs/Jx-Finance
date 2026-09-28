import { Link2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  useAccountsSuspense,
  useDebtPaymentCandidatesSuspense,
  useDebtPaymentsSuspense,
  useLinkDebtPayment,
  useUnlinkDebtPayment,
  useUpdateDebtPayment,
} from "@/api/generated";
import {
  DebtPaymentKind,
  type DebtPaymentResponse,
  type DebtResponse,
} from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { EditModal, Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RecordRow } from "@/components/record-row/record-row";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionHeader } from "@/components/ui/section/section";
import {
  ButtonSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";
import { EMPTY_VALUE, useIsoDate, useMoney } from "@/hooks/use-formatters";
import { silent } from "@/lib/mutations";
import { nameById, namedOptions, optionsOf } from "@/lib/options";
import { metaLine } from "@/lib/utils";
import { normalizeMoney, optionalPositiveMoney } from "@/lib/validation";

const kinds = Object.values(DebtPaymentKind);

interface PaymentFormProps {
  debts: DebtResponse[];
  transactionId?: string;
  payment?: DebtPaymentResponse;
  onClose: () => void;
}

export function DebtPaymentForm({
  debts,
  transactionId,
  payment,
  onClose,
}: Readonly<PaymentFormProps>) {
  const { t } = useTranslation();
  const link = useLinkDebtPayment(silent({ onSuccess: onClose }));
  const update = useUpdateDebtPayment(silent({ onSuccess: onClose }));
  const kindOptions = optionsOf(kinds, (kind) => t(`netWorth.payments.kinds.${kind}`));

  const form = useServerForm({
    defaultValues: {
      debtId: debts[0]?.id ?? "",
      kind: payment?.kind ?? "",
      principal: payment?.principalTyped ? payment.principal : "",
    },
    schema: z.object({ debtId: z.string(), kind: z.string(), principal: optionalPositiveMoney(t) }),
    submit: (value) => {
      const kind = kinds.find((item) => item === value.kind) ?? null;
      const principal = normalizeMoney(value.principal) || null;
      return payment
        ? update.mutateAsync({
            id: value.debtId,
            paymentId: payment.id,
            data: { kind: kind ?? DebtPaymentKind.regular, principal },
          })
        : link.mutateAsync({
            id: value.debtId,
            data: { transactionId: transactionId ?? "", kind, principal },
          });
    },
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        {payment ? null : (
          <form.Field name="debtId">
            {(field) => (
              <field.SelectFieldControl
                id="debt-payment-debt"
                label={t("netWorth.payments.debt")}
                options={namedOptions(debts)}
              />
            )}
          </form.Field>
        )}

        <form.Field name="kind">
          {(field) => (
            <field.SelectFieldControl
              id="debt-payment-kind"
              label={t("netWorth.payments.kind")}
              options={
                payment
                  ? kindOptions
                  : [{ value: "", label: t("netWorth.payments.kinds.auto") }, ...kindOptions]
              }
            />
          )}
        </form.Field>

        <form.Field name="principal">
          {(field) => (
            <field.MoneyInputField
              id="debt-payment-principal"
              label={t("netWorth.payments.principal")}
              hint={t("netWorth.payments.principalHint")}
            />
          )}
        </form.Field>

        <FormError error={payment ? update.error : link.error} />

        <form.FormActions
          span
          pending={link.isPending || update.isPending}
          submitLabel={t("actions.save")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}

interface DebtProps {
  debt: DebtResponse;
}

function CandidatesSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <Rows>
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className="flex items-center gap-3 py-2">
            <Skeleton className="size-4 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1">
              <TextSkeleton size="sm" width={rowWidth(index)} />
              <TextSkeleton size="xs" width="w-1/3" />
            </div>
            <TextSkeleton size="sm" className="shrink-0" width="w-20" />
          </li>
        ))}
      </Rows>
      <div className="flex justify-end">
        <ButtonSkeleton className="w-40" />
      </div>
    </div>
  );
}

function PaymentCandidates({ debt, onClose }: Readonly<DebtProps & { onClose: () => void }>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const candidates = useDebtPaymentCandidatesSuspense(debt.id).data;
  const accountNames = nameById(useAccountsSuspense().data);
  const link = useLinkDebtPayment(silent());
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelected(next);
  }

  function linkSelected() {
    const chosen = candidates
      .filter((item) => selected.has(item.id))
      .toSorted((a, b) => a.date.localeCompare(b.date));
    let linked: Promise<unknown> = Promise.resolve();
    for (const item of chosen) {
      linked = linked.then(() =>
        link.mutateAsync({ id: debt.id, data: { transactionId: item.id } }),
      );
    }
    linked.then(onClose, () => undefined);
  }

  if (candidates.length === 0) {
    return <EmptyText size="sm">{t("netWorth.payments.noCandidates")}</EmptyText>;
  }

  return (
    <div className="space-y-4">
      <Rows>
        {candidates.map((item) => (
          <li key={item.id}>
            <label className="flex items-center gap-3 py-2 text-sm">
              <Checkbox
                checked={selected.has(item.id)}
                onCheckedChange={(checked) => toggle(item.id, checked)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {item.description ?? EMPTY_VALUE}
                </span>
                <span className="block text-xs text-muted-foreground tabular-nums">
                  {metaLine(formatDate(item.date), accountNames.get(item.accountId))}
                </span>
              </span>
              <span className="font-semibold whitespace-nowrap tabular-nums">
                {money.format(Number(item.amount), item.currency)}
              </span>
            </label>
          </li>
        ))}
      </Rows>
      <FormError error={link.error} />
      <div className="flex justify-end">
        <Button disabled={selected.size === 0} pending={link.isPending} onClick={linkSelected}>
          {t("netWorth.payments.linkSelected", { count: selected.size })}
        </Button>
      </div>
    </div>
  );
}

export function DebtPayments({ debt }: Readonly<DebtProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const payments = useDebtPaymentsSuspense(debt.id).data;
  const accountNames = nameById(useAccountsSuspense().data);
  const unlink = useUnlinkDebtPayment(silent());
  const [editId, setEditId] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  function format(amount: string) {
    return money.format(Number(amount), debt.currency);
  }

  function split(payment: DebtPaymentResponse) {
    return metaLine(
      t("netWorth.payments.interest", { amount: format(payment.interest) }),
      t(payment.principalTyped ? "netWorth.payments.typed" : "netWorth.payments.principalPart", {
        amount: format(payment.principal),
      }),
      Number(payment.overpaid) > 0 &&
        t("netWorth.payments.overpaid", { amount: format(payment.overpaid) }),
      t("netWorth.payments.balanceAfter", { amount: format(payment.balance) }),
    );
  }

  return (
    <Section aria-label={t("netWorth.payments.title")}>
      <SectionHeader title={t("netWorth.payments.title")}>
        <Button variant="outline" size="sm" onClick={() => setLinking(true)}>
          <Link2 />
          {t("netWorth.payments.link")}
        </Button>
      </SectionHeader>
      <p className="text-sm">
        {t("netWorth.payments.balance")}:{" "}
        <span className="font-semibold text-expense tabular-nums">
          {format(debt.trackedBalance ?? debt.outstandingAmount)}
        </span>
      </p>
      <p className="max-w-prose text-xs text-muted-foreground">
        {t("netWorth.payments.anchor", {
          amount: format(debt.outstandingAmount),
          date: formatDate(debt.asOf),
        })}
      </p>
      {debt.trackedIncomplete ? (
        <p role="note" className="mt-2 max-w-prose text-sm text-muted-foreground">
          {t("netWorth.payments.incomplete")}
        </p>
      ) : null}
      {debt.unavailablePayments > 0 ? (
        <p role="note" className="mt-2 max-w-prose text-sm text-muted-foreground">
          {t("netWorth.payments.unavailable", { count: debt.unavailablePayments })}
        </p>
      ) : null}
      <FormError error={unlink.error} />
      {payments.length === 0 ? (
        <EmptyText size="sm">{t("netWorth.payments.empty")}</EmptyText>
      ) : (
        <Rows className="mt-2">
          {payments.toReversed().map((payment) => (
            <RecordRow
              key={payment.id}
              title={payment.description ?? EMPTY_VALUE}
              subtitle={metaLine(
                formatDate(payment.date),
                accountNames.get(payment.accountId),
                t(`netWorth.payments.kinds.${payment.kind}`),
              )}
              note={split(payment)}
              amount={format(payment.amount)}
              label={`${formatDate(payment.date)}, ${format(payment.amount)}`}
              onEdit={() => setEditId(payment.id)}
              removeKind="unlink"
              onDelete={() => unlink.mutate({ id: debt.id, paymentId: payment.id })}
              deletePending={unlink.isPending && unlink.variables?.paymentId === payment.id}
              deleteDisabled={unlink.isPending}
            />
          ))}
        </Rows>
      )}
      <EditModal
        item={payments.find((payment) => payment.id === editId) ?? null}
        title={t("netWorth.payments.edit")}
        onClose={() => setEditId(null)}
      >
        {(payment, close) => <DebtPaymentForm debts={[debt]} payment={payment} onClose={close} />}
      </EditModal>
      <Modal open={linking} onOpenChange={setLinking} title={t("netWorth.payments.link")}>
        <QueryBoundary fallback={<CandidatesSkeleton />} errorSubject={t("netWorth.payments.link")}>
          <PaymentCandidates debt={debt} onClose={() => setLinking(false)} />
        </QueryBoundary>
      </Modal>
    </Section>
  );
}
