import type { FocusEventHandler } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { Calendar, CalendarPopover } from "@/components/ui/calendar";
import { useDate } from "@/hooks/use-formatters";
import { parseIso, toIso } from "@/lib/calendar";

interface Props {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  onBlur?: FocusEventHandler<HTMLButtonElement>;
}

export function DatePicker({ value, onChange, placeholder, ...trigger }: Readonly<Props>) {
  const { t } = useTranslation();
  const dateFormat = useDate();
  const selected = parseIso(value) ?? undefined;

  return (
    <CalendarPopover
      {...trigger}
      label={selected ? dateFormat.format(selected) : (placeholder ?? t("datePicker.placeholder"))}
      empty={!selected}
      anchor={selected}
    >
      {({ month, setMonth, locale, today, close }) => {
        function pick(next: string) {
          onChange(next);
          close();
        }

        return (
          <>
            <Calendar
              mode="single"
              locale={locale}
              selected={selected}
              month={month}
              onMonthChange={setMonth}
              onSelect={(date) => pick(date ? toIso(date) : "")}
            />
            <div className="flex items-center justify-between border-t pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => pick("")}>
                {t("datePicker.clear")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => pick(today)}>
                {t("datePicker.today")}
              </Button>
            </div>
          </>
        );
      }}
    </CalendarPopover>
  );
}
