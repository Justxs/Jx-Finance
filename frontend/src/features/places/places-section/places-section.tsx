import { Merge } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { usePlacesSuspense } from "@/api/generated";
import type { PlaceSuggestionResponse } from "@/api/generated/model";
import { ListSection } from "@/components/list-section/list-section";
import { EditModal } from "@/components/modal";
import { NamedRow } from "@/components/named-row/named-row";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { PlaceRenameForm } from "@/features/places/place-rename-form/place-rename-form";

interface Renaming {
  id: string;
  places: readonly PlaceSuggestionResponse[];
}

export function PlacesSection() {
  const { t } = useTranslation();
  const places = usePlacesSuspense({ own: true }).data;
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [renaming, setRenaming] = useState<Renaming | null>(null);
  const chosen = places.filter((place) => selected.includes(place.name));

  function toggle(name: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, name] : current.filter((item) => item !== name),
    );
  }

  function open(list: readonly PlaceSuggestionResponse[]) {
    setRenaming({ id: list.map((place) => place.name).join("\n"), places: list });
  }

  function renamed() {
    setSelected([]);
    setRenaming(null);
  }

  return (
    <>
      <ListSection
        title={t("places.title")}
        count={places.length}
        description={t("places.explainer")}
        emptyText={t("places.empty")}
        action={
          places.length > 1 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={chosen.length < 2}
              onClick={() => open(chosen)}
            >
              <Merge />
              {t("places.mergeSelected", { count: chosen.length })}
            </Button>
          ) : null
        }
      >
        {places.map((place) => (
          <NamedRow
            key={place.name}
            name={place.name}
            scope="personal"
            householdId={null}
            leading={
              <Checkbox
                aria-label={t("places.select", { name: place.name })}
                checked={selected.includes(place.name)}
                onCheckedChange={(checked) => toggle(place.name, checked)}
              />
            }
            detail={t("places.count", { count: place.count })}
            onEdit={() => open([place])}
          />
        ))}
      </ListSection>

      <EditModal
        item={renaming}
        title={(item) =>
          item.places.length > 1 ? t("places.mergeTitle") : t("places.renameTitle")
        }
        onClose={() => setRenaming(null)}
      >
        {(item, close) => (
          <PlaceRenameForm places={item.places} onClose={close} onRenamed={renamed} />
        )}
      </EditModal>
    </>
  );
}
