import { Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useFindPriceSymbol } from "@/api/generated";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { silentMutation } from "@/lib/mutations";

interface Props {
  securityId: string;
  disabled: boolean;
  onChoose: (symbol: string) => void;
}

export function PriceSymbolFinder({ securityId, disabled, onChoose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const find = useFindPriceSymbol({
    mutation: { ...silentMutation, onError: () => setOpen(false) },
  });

  function toggle(next: boolean) {
    setOpen(next);
    if (next) {
      find.mutate({ id: securityId });
    }
  }

  return (
    <div className="col-span-full space-y-1.5">
      <div className="flex flex-wrap items-center gap-3">
        <Popover open={open} onOpenChange={toggle}>
          <PopoverTrigger
            disabled={disabled}
            render={<Button type="button" variant="outline" size="sm" />}
          >
            <Search />
            {t("investments.priceSource.find")}
          </PopoverTrigger>
          <PopoverContent
            align="start"
            aria-label={t("investments.priceSource.candidates")}
            className="w-80"
          >
            <p className="text-xs text-muted-foreground">
              {t("investments.priceSource.candidates")}
            </p>
            {find.isPending ? <TextSkeleton size="sm" width="w-48" /> : null}
            {find.data?.length === 0 ? (
              <EmptyText size="sm">{t("investments.priceSource.noCandidates")}</EmptyText>
            ) : null}
            {find.data && find.data.length > 0 ? (
              <ul className="-mx-1 space-y-0.5">
                {find.data.map((candidate) => (
                  <li key={candidate.symbol}>
                    <button
                      type="button"
                      className="flex w-full items-baseline gap-2 rounded-md px-1.5 py-1 text-left hover:bg-muted focus-visible:bg-muted focus-visible:outline-hidden"
                      onClick={() => {
                        onChoose(candidate.symbol);
                        setOpen(false);
                      }}
                    >
                      <span className="font-mono text-sm font-medium">{candidate.symbol}</span>
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {candidate.name}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {candidate.currency}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </PopoverContent>
        </Popover>
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {t("investments.priceSource.findHint")}
        </p>
      </div>
      <FormError error={find.error} />
    </div>
  );
}
