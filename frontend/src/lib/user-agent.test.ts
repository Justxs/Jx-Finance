import { describe, expect, it } from "vitest";
import { describeUserAgent } from "./user-agent";

const cases: readonly (readonly [string, string, string | null, string | null])[] = [
  [
    "Chrome on Windows",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    "Chrome 140",
    "Windows",
  ],
  [
    "Edge on Windows",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0",
    "Edge 140",
    "Windows",
  ],
  [
    "Firefox on Linux",
    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0",
    "Firefox 143",
    "Linux",
  ],
  [
    "Safari on macOS",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
    "Safari 18",
    "macOS",
  ],
  [
    "Safari on iPhone",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    "Safari 18",
    "iOS",
  ],
  [
    "Chrome on iPhone",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.101 Mobile/15E148 Safari/604.1",
    "Chrome 140",
    "iOS",
  ],
  [
    "Chrome on Android",
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36",
    "Chrome 140",
    "Android",
  ],
  [
    "Samsung Internet on Android",
    "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
    "Samsung Internet 28",
    "Android",
  ],
  [
    "Opera on Windows",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 OPR/122.0.0.0",
    "Opera 122",
    "Windows",
  ],
  [
    "Chrome on ChromeOS",
    "Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    "Chrome 140",
    "ChromeOS",
  ],
];

describe("describeUserAgent", () => {
  it.each(cases)("recognises %s", (_name, userAgent, browser, os) => {
    expect(describeUserAgent(userAgent)).toEqual({ browser, os });
  });

  it("answers nothing for a client that is not a browser", () => {
    expect(describeUserAgent("curl/8.9.1")).toEqual({ browser: null, os: null });
  });

  it("answers nothing for a missing or empty user agent", () => {
    expect(describeUserAgent(null)).toEqual({ browser: null, os: null });
    expect(describeUserAgent(undefined)).toEqual({ browser: null, os: null });
    expect(describeUserAgent("")).toEqual({ browser: null, os: null });
  });

  it("keeps the part it recognises when the other is unknown", () => {
    expect(describeUserAgent("Mozilla/5.0 (Windows NT 10.0) Gecko")).toEqual({
      browser: null,
      os: "Windows",
    });
  });
});
