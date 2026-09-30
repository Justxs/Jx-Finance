import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Scope } from "@/api/generated/model";
import { PageHeader } from "@/components/page-header/page-header";
import { PagePending } from "@/components/route-pending/route-pending";
import { SharedScopeTag } from "@/components/shared-scope-tag/shared-scope-tag";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { TextLink } from "@/components/ui/text-link/text-link";

interface Shown {
  name: string;
  scope: Scope;
  householdId: string | null;
}

interface Props<T extends Shown> {
  item: T | undefined;
  fallbackTitle: string;
  notFound: string;
  children: (item: T) => ReactNode;
}

export function DetailPage<T extends Shown>({
  item,
  fallbackTitle,
  notFound,
  children,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <p className="flex text-sm">
        <TextLink to="/net-worth" className="inline-flex items-center">
          <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
          {t("netWorth.schedule.back")}
        </TextLink>
      </p>
      <PageHeader title={item?.name ?? fallbackTitle}>
        {item ? <SharedScopeTag scope={item.scope} householdId={item.householdId} /> : null}
      </PageHeader>
      {item ? children(item) : <EmptyText>{notFound}</EmptyText>}
    </div>
  );
}

export function DetailPagePending({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PagePending
      header={
        <div className="space-y-5">
          <TextSkeleton size="sm" width="w-32" />
          <TextSkeleton size="page" width="w-48" />
        </div>
      }
    >
      {children}
    </PagePending>
  );
}
