import { useTranslation } from "react-i18next";
import type { HouseholdMemberResponse } from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { SelectField } from "@/components/select-field/select-field";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { userName } from "@/features/users/user-queries";
import { ALL, type ActivityFilters, KINDS } from "./activity-filters";

interface FilterProps {
  idPrefix: string;
  members: readonly HouseholdMemberResponse[];
  value: ActivityFilters;
  onChange: (value: ActivityFilters) => void;
}

export function ActivityFilterBar({ idPrefix, members, value, onChange }: Readonly<FilterProps>) {
  const { t } = useTranslation();

  return (
    <div
      role="group"
      aria-label={t("audit.filters.label")}
      className="flex flex-wrap items-end gap-x-4 gap-y-3 *:w-full sm:*:w-auto"
    >
      <FieldShell id={`${idPrefix}-activity-member`} label={t("audit.filters.member")}>
        <SelectField
          id={`${idPrefix}-activity-member`}
          className="sm:w-48"
          value={value.memberId}
          onChange={(memberId) => onChange({ ...value, memberId })}
          options={[
            { value: ALL, label: t("audit.filters.everyone") },
            ...members.map((member) => ({ value: member.userId, label: userName(member) })),
          ]}
        />
      </FieldShell>
      <FieldShell id={`${idPrefix}-activity-kind`} label={t("audit.filters.kind")}>
        <SelectField<ActivityFilters["kind"]>
          id={`${idPrefix}-activity-kind`}
          className="sm:w-48"
          value={value.kind}
          onChange={(kind) => onChange({ ...value, kind })}
          options={[
            { value: ALL, label: t("audit.filters.allKinds") },
            ...KINDS.map((kind) => ({ value: kind, label: t(`audit.kinds.${kind}`) })),
          ]}
        />
      </FieldShell>
      <FieldShell id={`${idPrefix}-activity-dates`} label={t("audit.filters.dates")}>
        <DateRangePicker
          id={`${idPrefix}-activity-dates`}
          className="sm:w-64"
          value={{ from: value.from, to: value.to }}
          onChange={(range) => onChange({ ...value, from: range.from, to: range.to })}
        />
      </FieldShell>
    </div>
  );
}
