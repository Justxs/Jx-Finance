import { useTranslation } from "react-i18next";
import type { CategorizationRuleResponse } from "@/api/generated/model";
import { MoveButtons } from "@/components/move-buttons/move-buttons";
import { type DeleteProps, RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Tag } from "@/components/ui/tag/tag";
import type { MoveDirection } from "@/lib/reorder";
import { actionText, conditionText, ruleActionNames } from "../rule-form/rule-summary";

interface Props extends DeleteProps {
  rule: CategorizationRuleResponse;
  total: number;
  accountNames: ReadonlyMap<string, string>;
  categoryNames: ReadonlyMap<string, string>;
  tagNames: ReadonlyMap<string, string>;
  movePending: boolean;
  onMove: (direction: MoveDirection) => void;
  onEdit: () => void;
}

export function RuleRow({
  rule,
  total,
  accountNames,
  categoryNames,
  tagNames,
  movePending,
  onMove,
  onEdit,
  ...deleteProps
}: Readonly<Props>) {
  const { t } = useTranslation();
  const names = ruleActionNames(rule, categoryNames, tagNames);

  return (
    <RowTransition>
      <li className="flex flex-wrap items-start justify-between gap-2 py-2.5">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 w-6 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
            {rule.position + 1}
          </span>
          <div className="min-w-0">
            <p className="min-w-0 text-sm font-medium wrap-break-word">{rule.name}</p>
            <p className="min-w-0 text-xs wrap-break-word text-muted-foreground">
              {conditionText(
                t,
                rule.match,
                rule.pattern,
                rule.accountId ? accountNames.get(rule.accountId) : undefined,
                rule.minAmount,
                rule.maxAmount,
              )}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span>{t("categorizationRules.action")}:</span>
              {names.categoryName ? <Tag tone="accent">{names.categoryName}</Tag> : null}
              {names.tagNames.map((name) => (
                <Tag key={name}>{name}</Tag>
              ))}
              {names.categoryName === undefined && names.tagNames.length === 0 ? (
                <span>{actionText(t, undefined, [])}</span>
              ) : null}
            </p>
          </div>
        </div>
        <RowActions label={rule.name} onEdit={onEdit} {...deleteProps}>
          <MoveButtons
            label={rule.name}
            first={rule.position === 0}
            last={rule.position === total - 1}
            disabled={movePending}
            onMove={onMove}
          />
        </RowActions>
      </li>
    </RowTransition>
  );
}
