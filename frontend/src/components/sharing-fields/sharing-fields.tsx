import { useTranslation } from "react-i18next";
import { useHouseholdsSuspense } from "@/api/generated";
import type { Scope } from "@/api/generated/model";
import { defineAppFieldGroup } from "@/components/form";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { namedOptions } from "@/lib/options";

const sharingFieldGroup = defineAppFieldGroup(({ strict }) => ({
  scope: strict<Scope>(),
  householdId: strict<string>(),
}));

interface Props {
  fields: typeof sharingFieldGroup.fields;
  idPrefix: string;
  grid?: boolean;
}

function SharingFieldsGroup({ fields, idPrefix, grid = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const households = useHouseholdsSuspense().data;

  if (households.length === 0) {
    return null;
  }

  const group = (
    <fields.Field name="scope">
      {(scopeField) => (
        <>
          <scopeField.SelectFieldControl
            id={`${idPrefix}-scope`}
            label={t("sharing.scope")}
            options={[
              { value: "personal", label: t("sharing.personal") },
              { value: "shared", label: t("sharing.shared") },
            ]}
          />

          {scopeField.value === "shared" ? (
            <fields.Field name="householdId">
              {(field) => (
                <field.SelectFieldControl
                  id={`${idPrefix}-household`}
                  label={t("sharing.household")}
                  options={namedOptions(households, t("sharing.selectHousehold"))}
                />
              )}
            </fields.Field>
          ) : null}
        </>
      )}
    </fields.Field>
  );

  return grid ? <FormGrid>{group}</FormGrid> : group;
}

export const SharingFields = sharingFieldGroup.bindComponent(SharingFieldsGroup, "fields");
