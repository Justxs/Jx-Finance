import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMeSuspense, useSecuritiesSuspense } from "@/api/generated";
import type { SecurityResponse } from "@/api/generated/model";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Input } from "@/components/ui/input/input";
import { Rows } from "@/components/ui/rows/rows";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { UserRole } from "@/lib/user-role";
import { SecurityModal } from "../security-form";
import { PriceWithDate, SecurityIdentity } from "../security-identity";

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
  const securities = useSecuritiesSuspense();
  const canEdit = useMeSuspense().data.role === UserRole.admin;
  const all = securities.data ?? [];
  const shown = all.filter((security) => matches(security, search));

  if (shown.length === 0) {
    return <EmptyText filtered={all.length > 0}>{t("investments.securities.empty")}</EmptyText>;
  }

  return (
    <Rows aria-label={t("investments.securities.title")}>
      {shown.map((security) => {
        const meta = [security.name, security.exchange, security.isin].filter(Boolean).join(" · ");

        return (
          <li key={security.id} className="flex items-center gap-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <SecurityIdentity
                security={security}
                meta={meta}
                wrap
                suffix={
                  <span className="text-xs text-muted-foreground">
                    {security.currency.toUpperCase()}
                  </span>
                }
              />
            </div>
            <div className="shrink-0 text-right">
              {security.lastPrice === null ? (
                <span className="text-xs text-muted-foreground">
                  {t("investments.securities.noPrice")}
                </span>
              ) : (
                <PriceWithDate
                  price={Number(security.lastPrice)}
                  currency={security.currency}
                  date={security.lastPriceDate}
                />
              )}
            </div>
            {canEdit ? (
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mr-2 shrink-0"
                onClick={() => onEdit(security)}
                aria-label={`${t("actions.edit")}: ${security.symbol}`}
              >
                <Pencil />
              </Button>
            ) : null}
          </li>
        );
      })}
    </Rows>
  );
}

function SecuritiesDialogContent() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SecurityResponse | undefined>(undefined);

  return (
    <>
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
    </>
  );
}

export function SecuritiesDialog({ open, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("investments.securities.title")}
      description={t("investments.securities.description")}
      className="sm:max-w-2xl"
    >
      <SecuritiesDialogContent />
    </Modal>
  );
}
