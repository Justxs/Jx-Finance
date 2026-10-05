import { HandCoins } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMeSuspense, useSettleUpSuspense } from "@/api/generated";
import type {
  HouseholdResponse,
  MemberBalanceResponse,
  SuggestedPaymentResponse,
} from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { Tag } from "@/components/ui/tag/tag";
import { SettlementForm } from "@/features/households/settlement-dialog/settlement-dialog";
import { useMoney } from "@/hooks/use-formatters";

interface Props {
  household: HouseholdResponse;
}

function useBalanceText(meId: string) {
  const { t } = useTranslation();
  const money = useMoney();

  return function balanceText(balance: MemberBalanceResponse) {
    const amount = money.format(Math.abs(Number(balance.amount)), balance.currency);
    const owed = Number(balance.amount) > 0;
    if (balance.userId === meId) {
      return owed
        ? t("households.settleUp.youAreOwed", { amount })
        : t("households.settleUp.youOwe", { amount });
    }
    return owed
      ? t("households.settleUp.isOwed", { name: balance.name, amount })
      : t("households.settleUp.owes", { name: balance.name, amount });
  };
}

export function SettleUpSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-2 border-t pt-4">
      <TextSkeleton size="sm" width="w-24" />
      <TextSkeleton size="sm" width="w-2/3" />
      <TextSkeleton size="sm" width="w-1/2" />
    </div>
  );
}

export function SettleUpSection({ household }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const meId = useMeSuspense().data.id;
  const { balances, payments } = useSettleUpSuspense(household.id).data;
  const balanceText = useBalanceText(meId);
  const [recording, setRecording] = useState<SuggestedPaymentResponse | null>(null);

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{t("households.settleUp.title")}</h4>
        <p className="max-w-prose text-sm text-muted-foreground">
          {t("households.settleUp.description")}
        </p>
      </div>
      {balances.length === 0 ? (
        <EmptyText>{t("households.settleUp.empty")}</EmptyText>
      ) : (
        <ul className="space-y-1 text-sm">
          {balances.map((balance) => (
            <li
              key={`${balance.userId}-${balance.currency}`}
              className="flex flex-wrap items-center gap-2 tabular-nums"
            >
              <span className="wrap-break-word">{balanceText(balance)}</span>
              {balance.isMember ? null : <Tag>{t("households.settleUp.formerMember")}</Tag>}
            </li>
          ))}
        </ul>
      )}
      {payments.length > 0 ? (
        <div className="space-y-1">
          <h5 className="text-sm font-medium">{t("households.settleUp.suggestions")}</h5>
          <Rows>
            {payments.map((payment) => {
              const pays = t("households.settleUp.pays", {
                from: payment.fromName,
                to: payment.toName,
                amount: money.format(Number(payment.amount), payment.currency),
              });
              return (
                <li
                  key={`${payment.fromUserId}-${payment.toUserId}-${payment.currency}`}
                  className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-sm wrap-break-word tabular-nums">{pays}</span>
                  {payment.fromUserId === meId || payment.toUserId === meId ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start sm:self-auto"
                      onClick={() => setRecording(payment)}
                      aria-label={`${t("households.settleUp.record")}: ${pays}`}
                    >
                      <HandCoins />
                      {t("households.settleUp.record")}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </Rows>
        </div>
      ) : null}
      <Modal
        open={recording !== null}
        onOpenChange={(open) => setRecording(open ? recording : null)}
        title={t("households.settlement.title")}
      >
        {recording ? (
          <QueryBoundary
            fallback={<TextSkeleton size="sm" width="w-2/3" />}
            errorSubject={t("households.settlement.title")}
          >
            <SettlementForm
              household={household}
              payment={recording}
              onClose={() => setRecording(null)}
            />
          </QueryBoundary>
        ) : null}
      </Modal>
    </div>
  );
}
