import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetSecuritiesEndpointSuspense } from "@/api/generated";
import type { SecurityResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag } from "@/components/ui/tag";
import { useIsoDate, usePriceFormat } from "@/hooks/use-formatters";
import { SecurityModal } from "../security-form";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ListProps {
  search: string;
  onEdit: (security: SecurityResponse) => void;
}

function matches(security: SecurityResponse, search: string) {
  const needle = search.trim().toLowerCase();
  if (needle === "") {
    return true;
  }

  return [security.symbol, security.name, security.isin ?? ""].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

function SecuritiesList({ search, onEdit }: Readonly<ListProps>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const formatPrice = usePriceFormat();
  const securities = useGetSecuritiesEndpointSuspense();
  const all = securities.data ?? [];
  const shown = all.filter((security) => matches(security, search));

  if (shown.length === 0) {
    return (
      <p className="py-6 text-sm text-muted-foreground">
        {all.length === 0 ? t("investments.securities.empty") : t("filters.noMatches")}
      </p>
    );
  }

  return (
    <ul className="rows" aria-label={t("investments.securities.title")}>
      {shown.map((security) => {
        const meta = [security.name, security.exchange, security.isin].filter(Boolean).join(" · ");

        return (
          <li key={security.id} className="flex items-center gap-3 py-2 text-sm">
            <div className="min-w-48 flex-1">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{security.symbol}</span>
                <Tag>{t(`investments.securityTypes.${security.type}`)}</Tag>
                <span className="text-xs text-muted-foreground">
                  {security.currency.toUpperCase()}
                </span>
              </p>
              <p className="truncate text-xs text-muted-foreground" title={meta}>
                {meta}
              </p>
            </div>
            <div className="shrink-0 text-right">
              {security.lastPrice === null ? (
                <span className="text-xs text-muted-foreground">
                  {t("investments.securities.noPrice")}
                </span>
              ) : (
                <>
                  <span className="block whitespace-nowrap tabular-nums">
                    {formatPrice(Number(security.lastPrice), security.currency)}
                  </span>
                  <span className="block text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                    {formatDate(security.lastPriceDate)}
                  </span>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="-mr-2 size-8 shrink-0"
              onClick={() => onEdit(security)}
              aria-label={`${t("actions.edit")}: ${security.symbol}`}
              tooltip={`${t("actions.edit")}: ${security.symbol}`}
            >
              <Pencil />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export function SecuritiesDialog({ open, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SecurityResponse | undefined>(undefined);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setSearch("");
        }
        onOpenChange(next);
      }}
      title={t("investments.securities.title")}
      description={t("investments.securities.description")}
      className="sm:max-w-2xl"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          className="min-w-48 flex-1"
          value={search}
          placeholder={t("investments.securities.search")}
          aria-label={t("investments.securities.search")}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
        >
          <Plus />
          {t("investments.securities.add")}
        </Button>
      </div>
      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <SecuritiesList
          search={search}
          onEdit={(security) => {
            setEditing(security);
            setFormOpen(true);
          }}
        />
      </QueryBoundary>
      <SecurityModal open={formOpen} security={editing} onOpenChange={setFormOpen} />
    </Modal>
  );
}
