import { useTranslation } from "react-i18next";
import type { HouseholdMemberResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { DateRangePicker } from "@/components/ui/date-range-picker/date-range-picker";
import { Label } from "@/components/ui/label/label";
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
      className="flex flex-wrap items-end gap-x-4 gap-y-3"
    >
      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor={`${idPrefix}-activity-member`}>{t("audit.filters.member")}</Label>
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
      </div>
      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor={`${idPrefix}-activity-kind`}>{t("audit.filters.kind")}</Label>
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
      </div>
      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor={`${idPrefix}-activity-dates`}>{t("audit.filters.dates")}</Label>
        <DateRangePicker
          id={`${idPrefix}-activity-dates`}
          className="sm:w-64"
          value={{ from: value.from, to: value.to }}
          onChange={(range) => onChange({ ...value, from: range.from, to: range.to })}
        />
      </div>
    </div>
  );
}
