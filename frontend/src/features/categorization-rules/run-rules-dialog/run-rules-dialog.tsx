import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { usePreviewCategorizationRun, useRunCategorizationRules } from "@/api/generated";
import type { AccountResponse, RunRulesResponse } from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Label } from "@/components/ui/label/label";
import { Rows } from "@/components/ui/rows/rows";
import { silent } from "@/lib/mutations";
import { namedOptions } from "@/lib/options";

interface Props {
  accounts: AccountResponse[];
  hasRules: boolean;
  onDone: () => void;
  onCancel: () => void;
}

export function RunRulesDialog({ accounts, hasRules, onDone, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const [accountId, setAccountId] = useState("");
  const [recategorize, setRecategorize] = useState(false);
  const [preview, setPreview] = useState<RunRulesResponse | null>(null);

  const previewMutation = usePreviewCategorizationRun(
    silent({ onSuccess: (data: RunRulesResponse) => setPreview(data) }),
  );

  const runMutation = useRunCategorizationRules(
    silent({
      onSuccess: (data: RunRulesResponse) => {
        toast.success(t("categorizationRules.runDone", { count: data.total }));
        onDone();
      },
    }),
  );

  function request() {
    return { data: { accountId: accountId || null, recategorize } };
  }

  function clearPreview() {
    setPreview(null);
    previewMutation.reset();
  }

  const matched = preview?.rules.filter((row) => row.rowCount > 0) ?? [];

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-sm text-muted-foreground">
        {t("categorizationRules.runDescription")}
      </p>

      <div className="space-y-1.5">
        <Label htmlFor="run-account">{t("categorizationRules.runAccount")}</Label>
        <SelectField
          id="run-account"
          value={accountId}
          options={namedOptions(accounts, t("categorizationRules.runEveryAccount"))}
          onChange={(next) => {
            setAccountId(next);
            clearPreview();
          }}
        />
      </div>

      <div className="space-y-1.5">
        <label className="flex items-start gap-2.5 text-sm">
          <Checkbox
            checked={recategorize}
            onCheckedChange={(next) => {
              setRecategorize(next);
              clearPreview();
            }}
          />
          <span>{t("categorizationRules.recategorize")}</span>
        </label>
        <p className="max-w-prose text-xs text-muted-foreground">
          {t("categorizationRules.recategorizeHint")}
        </p>
      </div>

      {preview ? (
        <section aria-labelledby="run-preview-title" className="space-y-2">
          <h3 id="run-preview-title" className="text-sm font-semibold">
            {t("categorizationRules.runPreviewTitle")}
          </h3>
          {matched.length === 0 ? (
            <EmptyText>{t("categorizationRules.runNothing")}</EmptyText>
          ) : (
            <>
              <Rows>
                {matched.map((row) => (
                  <li key={row.ruleId} className="flex items-baseline justify-between gap-3 py-1.5">
                    <span className="min-w-0 text-sm wrap-break-word">{row.name}</span>
                    <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                      {t("categorizationRules.runRows", { count: row.rowCount })}
                    </span>
                  </li>
                ))}
              </Rows>
              <p className="text-sm font-medium tabular-nums">
                {t("categorizationRules.runTotal", { count: preview.total })}
              </p>
            </>
          )}
        </section>
      ) : null}

      <FormError error={previewMutation.error ?? runMutation.error} />

      {hasRules ? null : <EmptyText>{t("categorizationRules.runNeedsRules")}</EmptyText>}

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!hasRules || runMutation.isPending}
          pending={previewMutation.isPending}
          onClick={() => previewMutation.mutate(request())}
        >
          {t("categorizationRules.runPreview")}
        </Button>
        <Button
          type="button"
          disabled={preview === null || preview.total === 0}
          pending={runMutation.isPending}
          onClick={() => runMutation.mutate(request())}
        >
          {preview === null
            ? t("categorizationRules.runApply")
            : t("categorizationRules.runApplyCount", { count: preview.total })}
        </Button>
      </div>
    </div>
  );
}
