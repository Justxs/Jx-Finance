type ByteUnit = "b" | "kb" | "mb" | "gb";

const units: readonly ByteUnit[] = ["b", "kb", "mb", "gb"];

export function splitBytes(bytes: number): { value: number; unit: ByteUnit } {
  let value = Math.max(0, bytes);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const digits = index === 0 || value >= 100 ? 0 : 1;
  const factor = 10 ** digits;
  return { value: Math.round(value * factor) / factor, unit: units[index] ?? "b" };
}
