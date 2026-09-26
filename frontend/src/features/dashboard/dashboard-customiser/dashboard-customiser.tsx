import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getDashboardLayoutQueryKey,
  useResetDashboardLayout,
  useSaveDashboardLayout,
} from "@/api/generated";
import type { DashboardCard, DashboardLayoutResponse, FeatureFlags } from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { MoveButtons } from "@/components/move-buttons/move-buttons";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { silent } from "@/lib/mutations";
import type { MoveDirection } from "@/lib/reorder";
import { dashboardCardTitle } from "../dashboard-card/dashboard-card";
import { type LayoutDraft, availableCards, moveCard, setCardShown } from "../dashboard-layout";

interface Props {
  layout: DashboardLayoutResponse;
  features: FeatureFlags;
  onDone: () => void;
}

export function DashboardCustomiser({ layout, features, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<LayoutDraft>({ order: layout.order, hidden: layout.hidden });
  const [announcement, setAnnouncement] = useState("");

  function finish(saved: DashboardLayoutResponse, message: string) {
    queryClient.setQueryData(getDashboardLayoutQueryKey(), saved);
    toast.success(message);
    onDone();
  }

  const saveMutation = useSaveDashboardLayout(
    silent({
      onSuccess: (saved: DashboardLayoutResponse) => finish(saved, t("dashboard.layout.saved")),
    }),
  );
  const resetMutation = useResetDashboardLayout(
    silent({
      onSuccess: (saved: DashboardLayoutResponse) => finish(saved, t("dashboard.layout.resetDone")),
    }),
  );
  const busy = saveMutation.isPending || resetMutation.isPending;

  const cards = availableCards(draft, features);
  const someSwitchedOff = cards.length < draft.order.length;

  function move(card: DashboardCard, direction: MoveDirection) {
    const next = moveCard(draft, card, direction, features);
    const nextCards = availableCards(next, features);
    const position = nextCards.indexOf(card);
    const atEdge = direction === "up" ? position === 0 : position === nextCards.length - 1;
    flushSync(() => setDraft(next));
    const opposite = direction === "up" ? "down" : "up";
    document.getElementById(`${titleId}-${card}-${atEdge ? opposite : direction}`)?.focus();
    setAnnouncement(
      t("dashboard.layout.moved", {
        card: dashboardCardTitle(t, card),
        position: position + 1,
        total: nextCards.length,
      }),
    );
  }

  function save() {
    resetMutation.reset();
    saveMutation.mutate({ data: { order: draft.order, hidden: draft.hidden } });
  }

  function resetToDefault() {
    saveMutation.reset();
    resetMutation.mutate();
  }

  return (
    <Section aria-labelledby={titleId} className="max-w-2xl">
      <SectionTitle id={titleId}>{t("dashboard.layout.title")}</SectionTitle>
      <p className="mt-1 text-sm text-muted-foreground">{t("dashboard.layout.intro")}</p>

      <Rows className="mt-4" aria-label={t("dashboard.layout.cards")}>
        {cards.map((card, index) => {
          const title = dashboardCardTitle(t, card);
          return (
            <li key={card} className="flex items-center gap-2 py-1.5">
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1.5 text-sm font-medium">
                <Checkbox
                  checked={!draft.hidden.includes(card)}
                  disabled={busy}
                  onCheckedChange={(shown) => setDraft(setCardShown(draft, card, shown))}
                />
                <span className="min-w-0 wrap-break-word">{title}</span>
              </label>
              <MoveButtons
                label={title}
                idPrefix={`${titleId}-${card}`}
                first={index === 0}
                last={index === cards.length - 1}
                disabled={busy}
                onMove={(direction) => move(card, direction)}
              />
            </li>
          );
        })}
      </Rows>
      <p role="status" className="sr-only">
        {announcement}
      </p>

      {someSwitchedOff ? (
        <p className="mt-3 text-xs text-muted-foreground">{t("dashboard.layout.switchedOff")}</p>
      ) : null}

      <FormError error={saveMutation.error ?? resetMutation.error} className="mt-4" />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={resetToDefault}
          pending={resetMutation.isPending}
          disabled={busy}
        >
          <RotateCcw />
          {t("dashboard.layout.reset")}
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onDone} disabled={busy}>
            {t("actions.cancel")}
          </Button>
          <Button onClick={save} pending={saveMutation.isPending} disabled={busy}>
            {t("actions.save")}
          </Button>
        </div>
      </div>
    </Section>
  );
}
