import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSecurities, useSetSecurityPrice } from "@/api/generated";
import type {
  AccountResponse,
  Currency,
  HoldingResponse,
  SecurityResponse,
} from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { Section, SectionTitle } from "@/components/ui/section";
import { PositionsTable } from "./positions-table";
import { PriceForm } from "./price-form";

interface Props {
  holdings: readonly HoldingResponse[];
  reportingCurrency: Currency;
  accounts: readonly AccountResponse[];
}

function isOpen(holding: HoldingResponse) {
  return Number(holding.quantity) !== 0;
}

function sharedSecurities(holdings: readonly HoldingResponse[]) {
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const holding of holdings) {
    if (seen.has(holding.security.id)) {
      shared.add(holding.security.id);
    }
    seen.add(holding.security.id);
  }

  return shared;
}

export function PositionsSection({ holdings, reportingCurrency, accounts }: Readonly<Props>) {
  const { t } = useTranslation();
  const [priceTarget, setPriceTarget] = useState<SecurityResponse | null>(null);
  const [priceOpen, setPriceOpen] = useState(false);
  const securities = useSecurities(undefined, {
    query: { throwOnError: false, meta: { silent: true } },
  });
  const priceSecurity =
    securities.data?.find((security) => security.id === priceTarget?.id) ?? priceTarget;

  const priceMutation = useSetSecurityPrice({
    mutation: {
      meta: { silent: true },
      onSuccess: () => setPriceOpen(false),
    },
  });

  function editPrice(security: SecurityResponse) {
    priceMutation.reset();
    setPriceTarget(security);
    setPriceOpen(true);
  }

  const open = holdings.filter(isOpen);
  const closed = holdings.filter((holding) => !isOpen(holding));
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const shared = sharedSecurities(holdings);

  return (
    <Section>
      <SectionTitle className="mb-2">{t("investments.holdings.title")}</SectionTitle>
      {open.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">{t("investments.holdings.empty")}</p>
      ) : (
        <PositionsTable
          label={t("investments.holdings.title")}
          holdings={open}
          reportingCurrency={reportingCurrency}
          accountNames={accountNames}
          sharedSecurityIds={shared}
          onEditPrice={editPrice}
        />
      )}

      {closed.length > 0 ? (
        <details className="group mt-4">
          <summary className="w-fit cursor-pointer rounded-sm py-1 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
            {t("investments.holdings.closed", { count: closed.length })}
          </summary>
          <div className="mt-2">
            <PositionsTable
              label={t("investments.holdings.closedLabel")}
              holdings={closed}
              reportingCurrency={reportingCurrency}
              accountNames={accountNames}
              sharedSecurityIds={shared}
              closed
              onEditPrice={editPrice}
            />
          </div>
        </details>
      ) : null}

      <Modal
        open={priceOpen}
        onOpenChange={setPriceOpen}
        title={t("investments.price.update")}
        description={priceSecurity ? `${priceSecurity.symbol} · ${priceSecurity.name}` : undefined}
      >
        {priceSecurity ? (
          <PriceForm
            key={priceSecurity.id}
            security={priceSecurity}
            pending={priceMutation.isPending}
            error={priceMutation.error}
            onSubmit={(values) => priceMutation.mutateAsync({ id: priceSecurity.id, data: values })}
            onCancel={() => setPriceOpen(false)}
          />
        ) : null}
      </Modal>
    </Section>
  );
}
