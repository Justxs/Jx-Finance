import { useTranslation } from "react-i18next";
import { splitBytes } from "./format-bytes";

export function useBytes() {
  const { t, i18n } = useTranslation();
  const number = new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 });

  return function formatBytes(bytes: number) {
    const { value, unit } = splitBytes(bytes);
    return t(`backup.bytes.${unit}`, { value: number.format(value) });
  };
}
