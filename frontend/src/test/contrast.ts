export type Rgb = readonly [number, number, number];

function channel(hex: string, start: number) {
  return Number.parseInt(hex.slice(start, start + 2), 16) / 255;
}

export function parseHex(value: string, name: string): Rgb {
  const digits = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)?.[1];
  if (!digits) {
    throw new Error(`${name} is "${value}"; only #rgb and #rrggbb colours are supported`);
  }
  const full = digits.length === 3 ? digits.replaceAll(/./g, "$&$&") : digits;
  return [channel(full, 0), channel(full, 2), channel(full, 4)];
}

function linear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance([red, green, blue]: Rgb) {
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

export function contrastRatio(first: Rgb, second: Rgb) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function composite(top: Rgb, alpha: number, bottom: Rgb): Rgb {
  return [
    top[0] * alpha + bottom[0] * (1 - alpha),
    top[1] * alpha + bottom[1] * (1 - alpha),
    top[2] * alpha + bottom[2] * (1 - alpha),
  ];
}
