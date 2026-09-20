import { useTranslation } from "react-i18next";
import type { HouseholdResponse, Scope } from "@/api/generated/model";
import { defineAppFieldGroup } from "@/components/form";

const sharingFieldGroup = defineAppFieldGroup(({ strict }) => ({
  scope: strict<Scope>(),
  householdId: strict<string>(),
}));

interface Props {
  fields: typeof sharingFieldGroup.fields;
  idPrefix: string;
  households: readonly HouseholdResponse[];
}

function SharingFieldsGroup({ fields, idPrefix, households }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
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
                  options={[
                    { value: "", label: t("sharing.selectHousehold") },
                    ...households.map((household) => ({
                      value: household.id,
                      label: household.name,
                    })),
                  ]}
                />
              )}
            </fields.Field>
          ) : null}
        </>
      )}
    </fields.Field>
  );
}

export const SharingFields = sharingFieldGroup.bindComponent(SharingFieldsGroup, "fields");
