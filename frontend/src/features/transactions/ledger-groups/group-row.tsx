import { ChevronRight, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TransactionGroupSummary } from "@/api/generated/model";
import { RowActions } from "@/components/row-actions/row-actions";
import { SharedScopeTag } from "@/components/shared-scope-tag/shared-scope-tag";
import { TransactionAmount } from "@/components/transaction-amount/transaction-amount";
import { Button } from "@/components/ui/button/button";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { TableCell, TableRow } from "@/components/ui/table/table";
import { useReportingCurrency } from "@/hooks/use-currencies";
import { useIsoDate, useShortDayIso } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";
import type { LedgerGroupHandlers } from "./use-ledger-groups";

export function useGroupDates() {
  const formatDate = useIsoDate();
  const shortDay = useShortDayIso();

  function parts(group: Pick<TransactionGroupSummary, "firstDate" | "lastDate">) {
    return group.firstDate === group.lastDate
      ? [formatDate(group.lastDate)]
      : [`${shortDay(group.firstDate)} –`, formatDate(group.lastDate)];
  }

  return {
    parts,
    text: (group: Pick<TransactionGroupSummary, "firstDate" | "lastDate">) =>
      parts(group).join(" "),
  };
}

export function useGroupCount() {
  const { t } = useTranslation();

  return function groupCount(group: TransactionGroupSummary) {
    return group.matchingCount < group.memberCount
      ? t("transactions.groups.matching", {
          count: group.memberCount,
          matching: group.matchingCount,
        })
      : t("transactions.groups.rows", { count: group.memberCount });
  };
}

interface NetProps {
  group: TransactionGroupSummary;
  className?: string;
}

export function GroupNet({ group, className }: Readonly<NetProps>) {
  const currency = useReportingCurrency();
  const net = Number(group.netReportingAmount);
  const amount = Math.abs(net).toFixed(2);

  return (
    <TransactionAmount
      transaction={{
        id: group.id,
        type: net > 0 ? "income" : "expense",
        amount,
        currency,
        reportingAmount: amount,
      }}
      className={className}
    />
  );
}

interface ToggleProps {
  group: TransactionGroupSummary;
  expanded: boolean;
  onToggle: (groupId: string) => void;
}

export function GroupToggle({ group, expanded, onToggle }: Readonly<ToggleProps>) {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-expanded={expanded}
      aria-label={t("transactions.groups.showRows", { count: group.memberCount, name: group.name })}
      onClick={() => onToggle(group.id)}
    >
      <ChevronRight className={cn("transition-transform", expanded && "rotate-90")} />
    </Button>
  );
}

interface Props {
  group: TransactionGroupSummary;
  expanded: boolean;
  selectable: boolean;
  nameSpan: number;
  handlers: LedgerGroupHandlers;
}

export function GroupRow({ group, expanded, selectable, nameSpan, handlers }: Readonly<Props>) {
  const groupDates = useGroupDates();
  const groupCount = useGroupCount();

  return (
    <TableRow data-kind="group">
      {selectable ? <TableCell className="pr-0" /> : null}
      <TableCell className="whitespace-normal text-muted-foreground tabular-nums">
        <span className="flex flex-wrap gap-x-1">
          {groupDates.parts(group).map((part) => (
            <span key={part} className="whitespace-nowrap">
              {part}
            </span>
          ))}
        </span>
      </TableCell>
      <TableCell colSpan={nameSpan} className="whitespace-normal">
        <span className="flex items-center gap-2">
          <GroupToggle group={group} expanded={expanded} onToggle={handlers.onToggle} />
          <Layers className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 truncate font-medium" title={group.name}>
            {group.name}
          </span>
          <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
            {groupCount(group)}
          </span>
          <SharedScopeTag
            scope={group.scope}
            householdId={group.householdId}
            className="shrink-0"
          />
        </span>
      </TableCell>
      <TableCell>
        <GroupNet group={group} className="block text-right" />
      </TableCell>
      <TableCell>
        <RowActions label={group.name} actions={handlers.actions(group)} className="justify-end" />
      </TableCell>
    </TableRow>
  );
}

export type GroupStatus =
  | { kind: "membersPending" }
  | { kind: "membersFailed"; retry: () => void }
  | { kind: "membersTruncated" };

export function GroupMembersStatus({ status }: Readonly<{ status: GroupStatus }>) {
  const { t } = useTranslation();

  if (status.kind === "membersPending") {
    return (
      <div role="status" aria-label={t("errors.loading")}>
        <TextSkeleton size="sm" width="w-1/2" />
      </div>
    );
  }
  if (status.kind === "membersFailed") {
    return (
      <div role="alert" className="flex items-center gap-3 text-sm">
        {t("errors.loadFailed")}
        <Button type="button" variant="outline" size="sm" onClick={status.retry}>
          {t("errors.retry")}
        </Button>
      </div>
    );
  }
  return <p className="text-xs text-muted-foreground">{t("transactions.groups.truncated")}</p>;
}

interface StatusRowProps {
  status: GroupStatus;
  columnCount: number;
}

export function GroupStatusRow({ status, columnCount }: Readonly<StatusRowProps>) {
  return (
    <TableRow>
      <TableCell colSpan={columnCount} className="pl-12">
        <GroupMembersStatus status={status} />
      </TableCell>
    </TableRow>
  );
}
