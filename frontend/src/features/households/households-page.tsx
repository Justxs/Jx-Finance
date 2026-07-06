import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { getGetHouseholdsEndpointQueryKey, useGetHouseholdsEndpoint } from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateHouseholdForm } from "./create-household-form";
import { HouseholdCard } from "./household-card";

export function HouseholdsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const households = useGetHouseholdsEndpoint();
  const householdList = households.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetHouseholdsEndpointQueryKey() });
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("households.title")} subtitle={t("households.subtitle")} />

      <section className="card p-6">
        <h2 className="mb-5 font-semibold">{t("households.add")}</h2>
        <CreateHouseholdForm onCreated={invalidate} />
      </section>

      {households.isPending ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-24 w-full" />
          ))}
        </div>
      ) : householdList.length === 0 ? (
        <p className="px-6 py-8 text-sm text-muted-foreground">{t("households.empty")}</p>
      ) : (
        <div className="space-y-6">
          {householdList.map((household) => (
            <HouseholdCard key={household.id} household={household} onChanged={invalidate} />
          ))}
        </div>
      )}
    </div>
  );
}
