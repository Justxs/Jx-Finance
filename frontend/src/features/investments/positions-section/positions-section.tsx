import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  Currency,
  HoldingResponse,
  SecurityResponse,
} from "@/api/generated/model";
import { Disclosure } from "@/components/disclosure/disclosure";
import { EditModal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RecordRowsSkeleton } from "@/components/record-row/record-row";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { PriceHistory } from "@/features/investments/price-history/price-history";
import { nameById } from "@/lib/options";
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
  const [priceTargetId, setPriceTargetId] = useState<string | null>(null);
  const priceSecurity =
    holdings.find((holding) => holding.security.id === priceTargetId)?.security ?? null;

  function editPrice(security: SecurityResponse) {
    setPriceTargetId(security.id);
  }

  const open = holdings.filter(isOpen);
  const closed = holdings.filter((holding) => !isOpen(holding));
  const accountNames = nameById(accounts);
  const shared = sharedSecurities(holdings);

  return (
    <Section>
      <SectionTitle className="mb-2">{t("investments.holdings.title")}</SectionTitle>
      {open.length === 0 ? (
        <EmptyText>{t("investments.holdings.empty")}</EmptyText>
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
        <Disclosure
          className="mt-4"
          summary={t("investments.holdings.closed", { count: closed.length })}
        >
          <PositionsTable
            label={t("investments.holdings.closedLabel")}
            holdings={closed}
            reportingCurrency={reportingCurrency}
            accountNames={accountNames}
            sharedSecurityIds={shared}
            closed
            onEditPrice={editPrice}
          />
        </Disclosure>
      ) : null}

      <EditModal
        item={priceSecurity}
        onClose={() => setPriceTargetId(null)}
        title={t("investments.price.update")}
        description={(security) => `${security.symbol} · ${security.name}`}
      >
        {(security, close) => (
          <>
            <PriceForm security={security} onClose={close} />
            <div className="mt-5 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">{t("investments.priceHistory.title")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("investments.priceHistory.hint")}
              </p>
              <QueryBoundary
                fallback={
                  <div className="mt-2">
                    <RecordRowsSkeleton rows={3} />
                  </div>
                }
                errorSubject={t("investments.priceHistory.title")}
              >
                <PriceHistory security={security} />
              </QueryBoundary>
            </div>
          </>
        )}
      </EditModal>
    </Section>
  );
}
