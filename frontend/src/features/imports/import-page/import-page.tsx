import { Link, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useGetAccountsSuspense } from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportSection } from "../import-section";

export function ImportPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/import" });
  const accounts = useGetAccountsSuspense();
  const accountList = accounts.data ?? [];

  return (
    <div className="space-y-10">
      <PageHeader title={t("imports.pageTitle")} description={t("imports.pageDescription")} />

      {accountList.length === 0 ? (
        <section className="section">
          <h2 className="section-title">{t("imports.noAccountsTitle")}</h2>
          <p className="py-4 text-sm text-muted-foreground">
            {t("imports.noAccounts")}{" "}
            <Link
              to="/accounts"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("imports.goToAccounts")}
            </Link>
          </p>
        </section>
      ) : (
        <QueryBoundary fallback={<Skeleton className="h-64 w-full" />}>
          <ImportSection accounts={accountList} initialAccountId={search.accountId} />
        </QueryBoundary>
      )}
    </div>
  );
}
