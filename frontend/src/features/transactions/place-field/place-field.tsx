import type { FieldWithValue } from "@tanstack/react-form";
import { useDebouncedValue } from "@tanstack/react-pacer";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { LocateFixed } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getPlacesSuspenseQueryOptions } from "@/api/generated";
import { defineAppFieldGroup } from "@/components/form";
import { FieldShell, fieldAria } from "@/components/form/field-shell/field-shell";
import { Button } from "@/components/ui/button/button";
import { Input } from "@/components/ui/input/input";
import { SEARCH_DEBOUNCE_MS } from "@/features/transactions/transaction-filter-fields";
import { silentQuery } from "@/lib/query-client";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

const LOCATE_TIMEOUT_MS = 10_000;
const COORDINATE_DECIMALS = 5;
const PERMISSION_DENIED = 1;
const TIMEOUT = 3;

type LocateProblem = "denied" | "timeout" | "unavailable";

const placeFieldGroup = defineAppFieldGroup(({ strict }) => ({
  place: strict<string>(),
  latitude: strict<number | null>(),
  longitude: strict<number | null>(),
}));

interface Props {
  fields: typeof placeFieldGroup.fields;
  idPrefix: string;
  className?: string;
}

interface InputProps {
  id: string;
  className?: string;
  field: FieldWithValue<string>;
  latitude: FieldWithValue<number | null>;
  longitude: FieldWithValue<number | null>;
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(COORDINATE_DECIMALS));
}

function problemOf(error: GeolocationPositionError): LocateProblem {
  if (error.code === PERMISSION_DENIED) {
    return "denied";
  }
  return error.code === TIMEOUT ? "timeout" : "unavailable";
}

function PlaceInput({ id, className, field, latitude, longitude }: Readonly<InputProps>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [locating, setLocating] = useState(false);
  const [problem, setProblem] = useState<LocateProblem | null>(null);
  const [search] = useDebouncedValue(field.value.trim(), { wait: SEARCH_DEBOUNCE_MS });
  const suggestions = useQuery({
    ...getPlacesSuspenseQueryOptions(search ? { search } : undefined),
    ...silentQuery,
    placeholderData: keepPreviousData,
  });
  const listId = `${id}-suggestions`;
  const located = latitude.value !== null && longitude.value !== null;
  const { error, ...aria } = fieldAria(field, { id });

  async function nameFromHistory(lat: number, lon: number) {
    const nearby = await queryClient
      .query({ ...getPlacesSuspenseQueryOptions({ lat, lon }), ...silentQuery })
      .catch(() => []);
    const match = nearby.find((place) => place.nearby);
    if (match && field.value.trim() === "") {
      field.handleChange(match.name);
    }
  }

  function locate() {
    setLocating(true);
    setProblem(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = roundCoordinate(position.coords.latitude);
        const lon = roundCoordinate(position.coords.longitude);
        latitude.handleChange(lat);
        longitude.handleChange(lon);
        setLocating(false);
        void nameFromHistory(lat, lon);
      },
      (failure) => {
        setLocating(false);
        setProblem(problemOf(failure));
      },
      { enableHighAccuracy: true, timeout: LOCATE_TIMEOUT_MS, maximumAge: 0 },
    );
  }

  function forget() {
    latitude.handleChange(null);
    longitude.handleChange(null);
  }

  return (
    <FieldShell
      id={id}
      label={t("transactions.place.label")}
      error={error}
      className={className}
      footer={
        <>
          {located ? (
            <p className="text-xs text-muted-foreground">
              {t("transactions.place.locationSaved")} ·{" "}
              <Button
                type="button"
                variant="link-muted"
                size="inline"
                aria-label={t("transactions.place.removeLabel")}
                onClick={forget}
              >
                {t("transactions.place.remove")}
              </Button>
            </p>
          ) : null}
          {problem ? (
            <p role="status" className={cn("text-xs", EXPENSE_TONE)}>
              {t(`transactions.place.${problem}`)}
            </p>
          ) : null}
        </>
      }
    >
      <div className="flex flex-wrap gap-2">
        <Input
          {...aria}
          id={id}
          className="min-w-40 flex-1"
          list={listId}
          autoComplete="off"
          value={field.value}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
        />
        {globalThis.isSecureContext ? (
          <Button type="button" variant="outline" pending={locating} onClick={locate}>
            <LocateFixed />
            {t("transactions.place.useMyLocation")}
          </Button>
        ) : null}
      </div>
      <datalist id={listId}>
        {(suggestions.data ?? []).map((place) => (
          <option key={place.name} value={place.name}>
            {place.name}
          </option>
        ))}
      </datalist>
    </FieldShell>
  );
}

function PlaceFieldGroup({ fields, idPrefix, className }: Readonly<Props>) {
  return (
    <fields.Field name="latitude">
      {(latitude) => (
        <fields.Field name="longitude">
          {(longitude) => (
            <fields.Field name="place">
              {(field) => (
                <PlaceInput
                  id={`${idPrefix}-place`}
                  className={className}
                  field={field}
                  latitude={latitude}
                  longitude={longitude}
                />
              )}
            </fields.Field>
          )}
        </fields.Field>
      )}
    </fields.Field>
  );
}

export const PlaceField = placeFieldGroup.bindComponent(PlaceFieldGroup, "fields");
