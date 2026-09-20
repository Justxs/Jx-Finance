import { useTranslation } from "react-i18next";
import { useNumberFormat } from "@/hooks/use-formatters";
import { splitBytes } from "./format-bytes";

export function useBytes() {
  const { t } = useTranslation();
  const number = useNumberFormat(1);

  return function formatBytes(bytes: number) {
    const { value, unit } = splitBytes(bytes);
    return t(`backup.bytes.${unit}`, { value: number.format(value) });
  };
}
