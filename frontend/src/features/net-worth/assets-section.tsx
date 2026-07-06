import { useQueryClient } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetAssetsEndpointQueryKey,
  getGetNetWorthEndpointQueryKey,
  getGetNetWorthHistoryEndpointQueryKey,
  useDeleteAssetEndpoint,
  useGetAssetsEndpoint,
} from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDate, useMoney } from "@/hooks/use-formatters";
import { AssetForm } from "./asset-form";

export function AssetsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const money = useMoney();
  const date = useDate();

  const assets = useGetAssetsEndpoint();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetAssetsEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNetWorthEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNetWorthHistoryEndpointQueryKey() });
  }

  const deleteMutation = useDeleteAssetEndpoint({ mutation: { onSettled: invalidate } });
  const assetList = assets.data ?? [];

  let content: ReactNode;
  if (assets.isPending) {
    content = <Skeleton className="m-6 h-16 w-full" />;
  } else if (assetList.length === 0) {
    content = <p className="px-6 py-6 text-sm text-muted-foreground">{t("netWorth.noAssets")}</p>;
  } else {
    content = (
      <ul className="divide-y divide-border">
        {assetList.map((asset) => (
          <li key={asset.id} className="flex items-center justify-between px-6 py-3">
            <div>
              <p className="font-medium">{asset.name}</p>
              <p className="text-xs text-muted-foreground">
                {t(`netWorth.assetTypes.${asset.type}`)} · {date.format(new Date(asset.asOf!))}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold tabular-nums">{money.format(Number(asset.currentValue))}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate({ id: asset.id! })}
              >
                {t("actions.delete")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="card">
      <div className="border-b p-6">
        <h2 className="mb-5 font-semibold">{t("netWorth.addAsset")}</h2>
        <AssetForm onCreated={invalidate} />
      </div>
      {content}
    </section>
  );
}
