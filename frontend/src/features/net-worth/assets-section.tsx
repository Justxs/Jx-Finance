import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetAssetsEndpointQueryKey,
  getGetNetWorthEndpointQueryKey,
  getGetNetWorthHistoryEndpointQueryKey,
  useDeleteAssetEndpoint,
  useGetAssetsEndpointSuspense,
} from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useDate, useMoney } from "@/hooks/use-formatters";
import { AssetForm } from "./asset-form";

export function AssetsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const money = useMoney();
  const date = useDate();
  const [addOpen, setAddOpen] = useState(false);

  const assets = useGetAssetsEndpointSuspense();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetAssetsEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNetWorthEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNetWorthHistoryEndpointQueryKey() });
  }

  const deleteMutation = useDeleteAssetEndpoint({ mutation: { onSettled: invalidate } });
  const assetList = assets.data ?? [];

  const deletingId = deleteMutation.isPending ? deleteMutation.variables?.id : undefined;

  let content: ReactNode;
  if (assetList.length === 0) {
    content = <p className="px-6 py-6 text-sm text-muted-foreground">{t("netWorth.noAssets")}</p>;
  } else {
    content = (
      <ul className="divide-y divide-border">
        {assetList.map((asset) => (
          <li
            key={asset.id}
            className="flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 break-words">
              <p className="font-medium">{asset.name}</p>
              <p className="text-xs text-muted-foreground">
                {t(`netWorth.assetTypes.${asset.type}`)} · {date.format(new Date(asset.asOf!))}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold tabular-nums">
                {money.format(Number(asset.currentValue))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                pending={deletingId === asset.id}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: asset.id! })}
                aria-label={t("actions.delete")}
                title={t("actions.delete")}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-6">
        <h2 className="font-semibold">{t("netWorth.addAsset")}</h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          {t("actions.add")}
        </Button>
      </div>
      <Dialog open={addOpen} onOpenChange={setAddOpen} title={t("netWorth.addAsset")}>
        <AssetForm
          onCreated={() => {
            invalidate();
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>
      {content}
    </section>
  );
}
