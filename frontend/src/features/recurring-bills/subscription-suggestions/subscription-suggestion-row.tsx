import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  SubscriptionCandidateResponse,
} from "@/api/generated/model";
import { updateRecurringBillBodyNameMax } from "@/api/schemas/recurring-bills/recurring-bills.zod";
import { Button } from "@/components/ui/button/button";
import { Tag } from "@/components/ui/tag/tag";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { metaLine } from "@/lib/utils";
import { BillRowLayout } from "../bill-row-layout";

const MAX_LISTED_DATES = 4;

export function suggestedName(description: string) {
  const trimmed = description.slice(0, updateRecurringBillBodyNameMax);
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

interface Props {
  candidate: SubscriptionCandidateResponse;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  onCreate: () => void;
  onDismiss: () => void;
  dismissPending: boolean;
  dismissDisabled: boolean;
}

export function SubscriptionSuggestionRow({
  candidate,
  accounts,
  categories,
  onCreate,
  onDismiss,
  dismissPending,
  dismissDisabled,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();

  const name = suggestedName(candidate.description);
  const account = accounts.find((item) => item.id === candidate.accountId);
  const category = categories.find((item) => item.id === candidate.categoryId);
  const listed = metaLine(...candidate.occurrenceDates.slice(-MAX_LISTED_DATES).map(formatDate));

  return (
    <BillRowLayout
      heading={
        <>
          <p className="min-w-0 font-medium wrap-break-word">{name}</p>
          <Tag tone="accent">{t(`recurringBills.cadences.${candidate.cadence}`)}</Tag>
        </>
      }
      meta={
        <>
          <p className="text-xs wrap-break-word text-muted-foreground">
            <span className="text-foreground tabular-nums">
              {t("subscriptions.nextExpected")}: {formatDate(candidate.nextExpectedDate)}
            </span>
            {account ? ` · ${account.name}` : ""}
            {category ? ` · ${category.name}` : ""}
          </p>
          <p className="text-xs wrap-break-word text-muted-foreground">
            {t("subscriptions.basedOn", { count: candidate.occurrenceDates.length })}
            {listed ? `: ${listed}` : ""}
          </p>
        </>
      }
      amount={
        <span className="text-right text-sm font-semibold whitespace-nowrap tabular-nums">
          {money.format(Number(candidate.typicalAmount))}
        </span>
      }
      actions={
        <>
          <Button variant="outline" size="sm" className="mr-2" onClick={onCreate}>
            <Plus />
            {t("subscriptions.create")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            pending={dismissPending}
            disabled={dismissDisabled}
            onClick={onDismiss}
            aria-label={`${t("subscriptions.dismiss")}: ${name}`}
          >
            <X />
          </Button>
        </>
      }
    />
  );
}
