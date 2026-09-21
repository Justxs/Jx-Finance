export interface UserAgentLabel {
  browser: string | null;
  os: string | null;
}

const browsers: readonly (readonly [string, RegExp])[] = [
  ["Edge", /\bEdg(?:e|A|iOS)?\/(\d+)/u],
  ["Opera", /\b(?:OPR|Opera)\/(\d+)/u],
  ["Vivaldi", /\bVivaldi\/(\d+)/u],
  ["Samsung Internet", /\bSamsungBrowser\/(\d+)/u],
  ["Firefox", /\b(?:Firefox|FxiOS)\/(\d+)/u],
  ["Chrome", /\b(?:Chrome|CriOS)\/(\d+)/u],
  ["Safari", /\bVersion\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari\//u],
];

const systems: readonly (readonly [string, RegExp])[] = [
  ["Windows", /\bWindows\b/u],
  ["Android", /\bAndroid\b/u],
  ["iOS", /\b(?:iPhone|iPad|iPod)\b/u],
  ["macOS", /\bMac OS X\b|\bMacintosh\b/u],
  ["ChromeOS", /\bCrOS\b/u],
  ["Linux", /\bLinux\b|\bX11\b/u],
];

export function describeUserAgent(userAgent: string | null | undefined): UserAgentLabel {
  const value = userAgent ?? "";
  let browser: string | null = null;
  for (const [name, pattern] of browsers) {
    const match = pattern.exec(value);
    if (match) {
      browser = match[1] ? `${name} ${match[1]}` : name;
      break;
    }
  }
  const os = systems.find(([, pattern]) => pattern.test(value))?.[0] ?? null;
  return { browser, os };
}
