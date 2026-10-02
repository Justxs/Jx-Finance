import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTestCategorizationRule } from "@/api/generated";
import type { DescriptionMatch } from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { Button } from "@/components/ui/button/button";
import { Input } from "@/components/ui/input/input";
import { silentMutation } from "@/lib/mutations";
import { normalizeMoney } from "@/lib/validation";

interface Props {
  match: DescriptionMatch;
  pattern: string;
  minAmount: string;
  maxAmount: string;
  action: string;
}

function optionalAmount(value: string) {
  return value.trim() ? normalizeMoney(value) : null;
}

export function RuleTester({ match, pattern, minAmount, maxAmount, action }: Readonly<Props>) {
  const { t } = useTranslation();
  const [sample, setSample] = useState("");
  const [sampleAmount, setSampleAmount] = useState("");
  const testMutation = useTestCategorizationRule({ mutation: silentMutation });
  const result = testMutation.data;

  function run() {
    testMutation.mutate({
      data: {
        match,
        pattern: pattern.trim(),
        description: sample.trim(),
        amount: optionalAmount(sampleAmount),
        minAmount: optionalAmount(minAmount),
        maxAmount: optionalAmount(maxAmount),
      },
    });
  }

  let verdict = t("categorizationRules.testerIdle");
  if (result?.matches) {
    verdict = `${t("categorizationRules.testerMatch")} ${t("categorizationRules.testerSets", { action })}`;
  } else if (result?.descriptionMatches) {
    verdict = t("categorizationRules.testerAmountOnly");
  } else if (result) {
    verdict = t("categorizationRules.testerNoMatch");
  }

  return (
    <fieldset className="space-y-3 border-t border-rule pt-4 *:clear-both">
      <legend className="float-left -mt-1 mb-2 w-full text-sm font-semibold">
        {t("categorizationRules.tester")}
      </legend>
      <FieldShell id="rule-sample" label={t("categorizationRules.sample")}>
        <Input
          id="rule-sample"
          value={sample}
          placeholder={t("categorizationRules.samplePlaceholder")}
          onChange={(event) => setSample(event.target.value)}
        />
      </FieldShell>
      <div className="flex flex-wrap items-end gap-2">
        <FieldShell
          id="rule-sample-amount"
          label={t("categorizationRules.sampleAmount")}
          className="min-w-32 flex-1"
        >
          <Input
            id="rule-sample-amount"
            inputMode="decimal"
            value={sampleAmount}
            onChange={(event) => setSampleAmount(event.target.value)}
          />
        </FieldShell>
        <Button
          type="button"
          variant="outline"
          disabled={sample.trim() === "" || pattern.trim() === ""}
          pending={testMutation.isPending}
          onClick={run}
        >
          {t("categorizationRules.tester")}
        </Button>
      </div>
      <p role="status" className="max-w-prose text-sm text-muted-foreground">
        {verdict}
      </p>
      <FormError error={testMutation.error} />
    </fieldset>
  );
}
