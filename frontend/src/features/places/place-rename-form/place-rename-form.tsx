import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useRenamePlace } from "@/api/generated";
import type { PlaceSuggestionResponse } from "@/api/generated/model";
import { renamePlaceBodyNameMax } from "@/api/schemas/transactions/transactions.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { silentMutation } from "@/lib/mutations";
import { requiredText } from "@/lib/validation";

interface Props {
  places: readonly PlaceSuggestionResponse[];
  onClose: () => void;
  onRenamed: () => void;
}

function mostUsedName(places: readonly PlaceSuggestionResponse[]): string {
  return places.toSorted((a, b) => b.count - a.count)[0]?.name ?? "";
}

export function PlaceRenameForm({ places, onClose, onRenamed }: Readonly<Props>) {
  const { t } = useTranslation();
  const rename = useRenamePlace({ mutation: { ...silentMutation, onSuccess: onRenamed } });
  const merging = places.length > 1;
  const count = places.reduce((sum, place) => sum + place.count, 0);

  const form = useServerForm({
    defaultValues: { name: mostUsedName(places) },
    schema: z.object({ name: requiredText(t, renamePlaceBodyNameMax) }),
    submit: (value) =>
      rename.mutateAsync({
        data: { places: places.map((place) => place.name), name: value.name.trim() },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        {merging ? (
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">{t("places.merging")}</p>
            <ul className="list-inside list-disc">
              {places.map((place) => (
                <li key={place.name} className="wrap-break-word">
                  {place.name}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <form.Field name="name">
          {(field) => <field.TextField id="place-name" label={t("places.name")} autoFocus />}
        </form.Field>

        <p className="text-sm text-muted-foreground">{t("places.preview", { count })}</p>

        <FormError error={rename.error} />

        <form.FormActions
          pending={rename.isPending}
          submitLabel={merging ? t("places.merge") : t("places.rename")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
