import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetHouseholdsEndpointQueryKey,
  useGetHouseholdsEndpointSuspense,
} from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CreateHouseholdForm } from "./create-household-form";
import { HouseholdCard } from "./household-card";

export function HouseholdsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const households = useGetHouseholdsEndpointSuspense();
  const householdList = households.data ?? [];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetHouseholdsEndpointQueryKey() });
  }

  let content: ReactNode;
  if (householdList.length === 0) {
    content = (
      <section className="card">
        <p className="px-6 py-8 text-sm text-muted-foreground">{t("households.empty")}</p>
      </section>
    );
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
      <PageHeader title={t("households.title")}>
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
