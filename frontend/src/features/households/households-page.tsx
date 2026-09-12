import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { getGetHouseholdsEndpointQueryKey, useGetHouseholdsEndpoint } from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateHouseholdForm } from "./create-household-form";
import { HouseholdCard } from "./household-card";

export function HouseholdsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const households = useGetHouseholdsEndpoint();
  const householdList = households.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetHouseholdsEndpointQueryKey() });
  }

  let content: ReactNode;
  if (households.isPending) {
    content = (
      <div className="space-y-4">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full" />
        ))}
      </div>
    );
  } else if (householdList.length === 0) {
    content = <p className="px-6 py-8 text-sm text-muted-foreground">{t("households.empty")}</p>;
  } else {
    content = (
      <div className="space-y-6">
        {householdList.map((household) => (
          <HouseholdCard key={household.id} household={household} onChanged={invalidate} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("households.title")} subtitle={t("households.subtitle")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("households.add")}
        </Button>
      </PageHeader>

      <Dialog open={addOpen} onOpenChange={setAddOpen} title={t("households.add")}>
        <CreateHouseholdForm
          onCreated={() => {
            invalidate();
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>

      {content}
    </div>
  );
}
