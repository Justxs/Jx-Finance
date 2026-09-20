import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { Calendar, CalendarPopover } from "@/components/ui/calendar";
import { useDate } from "@/hooks/use-formatters";
import { parseIso, toIso } from "@/lib/calendar";

export interface DateRange {
  from: string;
  to: string;
}

interface Props {
  id?: string;
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({ value, onChange, placeholder, ...trigger }: Readonly<Props>) {
  const { t } = useTranslation();
  const dateFormat = useDate();

  const from = parseIso(value.from) ?? undefined;
  const to = parseIso(value.to) ?? undefined;

  let label = placeholder ?? t("datePicker.anyDate");
  if (from && to) {
    label = `${dateFormat.format(from)} – ${dateFormat.format(to)}`;
  } else if (from) {
    label = `${dateFormat.format(from)} –`;
  } else if (to) {
    label = `– ${dateFormat.format(to)}`;
  }

  return (
    <CalendarPopover {...trigger} label={label} empty={!from && !to} anchor={from}>
      {({ month, setMonth, locale, close }) => {
        function pick(iso: string) {
          const startingOver = !value.from || Boolean(value.to);
          if (startingOver) {
            onChange({ from: iso, to: "" });
            return;
          }

          if (iso < value.from) {
            onChange({ from: iso, to: value.from });
          } else {
            onChange({ from: value.from, to: iso });
          }
          close();
        }

        return (
          <>
            <Calendar
              mode="range"
              locale={locale}
              selected={{ from, to }}
              month={month}
              onMonthChange={setMonth}
              onDayClick={(day) => pick(toIso(day))}
            />
            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <span className="truncate text-xs text-muted-foreground">
                {value.from && !value.to ? t("datePicker.pickEnd") : t("datePicker.pickStart")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!value.from && !value.to}
                onClick={() => onChange({ from: "", to: "" })}
              >
                {t("datePicker.clear")}
              </Button>
            </div>
          </>
        );
      }}
    </CalendarPopover>
  );
}
