import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CategorizationRuleResponse } from "@/api/generated/model";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";
import { Tag } from "@/components/ui/tag/tag";
import { actionText, conditionText, ruleActionNames } from "../rule-form/rule-summary";

interface Props {
  rule: CategorizationRuleResponse;
  total: number;
  accountNames: ReadonlyMap<string, string>;
  categoryNames: ReadonlyMap<string, string>;
  tagNames: ReadonlyMap<string, string>;
  movePending: boolean;
  deletePending: boolean;
  deleteDisabled: boolean;
  onMove: (direction: "up" | "down") => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function RuleRow({
  rule,
  total,
  accountNames,
  categoryNames,
  tagNames,
  movePending,
  deletePending,
  deleteDisabled,
  onMove,
  onEdit,
  onDelete,
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
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={rule.position === 0 || movePending}
            onClick={() => onMove("up")}
            aria-label={t("categorizationRules.moveUp", { rule: rule.name })}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={rule.position === total - 1 || movePending}
            onClick={() => onMove("down")}
            aria-label={t("categorizationRules.moveDown", { rule: rule.name })}
          >
            <ArrowDown />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label={`${t("actions.edit")}: ${rule.name}`}
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            pending={deletePending}
            disabled={deleteDisabled}
            onClick={onDelete}
            aria-label={`${t("actions.delete")}: ${rule.name}`}
          >
            <Trash2 />
          </Button>
        </div>
      </li>
    </RowTransition>
  );
}
