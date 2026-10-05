import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const navy = "#253e52";
const paper = "#fbfbfc";
const paleBlue = "#a6c5dc";
const hero = "#1f3546";
const heroMuted = "#b9c7d2";
const mutedInk = "#5d6872";

function birdPath(file) {
  const source = readFileSync(resolve(root, "scripts/brand", file), "utf8");
  const match = /<path[^>]*\sd="([^"]+)"/.exec(source);
  if (!match) {
    throw new Error(`${file} has no path`);
  }
  return match[1].replaceAll(/\s+/g, " ").trim();
}

function round(value) {
  return Math.round(value * 100) / 100;
}

function placed(path, box, size, share) {
  const scale = (size * share) / Math.max(box.width, box.height);
  const x = (size - box.width * scale) / 2 - box.x * scale;
  const y = (size - box.height * scale) / 2 - box.y * scale;
  return `<path transform="translate(${round(x)} ${round(y)}) scale(${round(scale * 10000) / 10000})" d="${path}"`;
}

function tileSvg(path, box, { radius, share }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect fill="${navy}" width="64" height="64" rx="${radius}"/>
  ${placed(path, box, 64, share)} fill="${paper}"/>
</svg>
`;
}

function faviconSvg(path, box) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <style>
    .bird { fill: ${navy}; }
    @media (prefers-color-scheme: dark) {
      .bird { fill: ${paleBlue}; }
    }
  </style>
  ${placed(path, box, 64, 1)} class="bird"/>
</svg>
`;
}

function markSvg(path, box) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.width} ${box.height}">
  <path fill="${navy}" d="${path}"/>
</svg>
`;
}

function fontFace(family, file) {
  const data = readFileSync(resolve(root, "src/assets/fonts", file)).toString("base64");
  return `@font-face{font-family:${family};font-weight:200 900;src:url(data:font/woff2;base64,${data}) format("woff2")}`;
}

function socialPreviewHtml(path, box) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
${fontFace("LedgerSerif", "source-serif-4-latin-wght-normal.woff2")}
${fontFace("LedgerSans", "source-sans-3-latin-wght-normal.woff2")}
body{margin:0}
.card{position:relative;width:1200px;height:630px;background:${paper};overflow:hidden}
.band{position:absolute;inset:0 0 96px 0;background:${hero};display:flex;flex-direction:column;justify-content:center;padding:0 96px}
.lockup{display:flex;align-items:center;gap:36px}
.lockup svg{height:150px;width:auto;fill:${paper}}
.name{font:600 104px/1 LedgerSerif;color:${paper};letter-spacing:-0.015em}
.tagline{margin-top:40px;font:400 40px/1.3 LedgerSans;color:${heroMuted}}
.edge{position:absolute;left:0;bottom:78px}
.foot{position:absolute;left:96px;right:96px;bottom:0;height:78px;display:flex;align-items:center;justify-content:space-between;font:500 26px LedgerSans;color:${mutedInk}}
</style></head><body><div class="card">
<div class="band">
<div class="lockup"><svg viewBox="${box.x} ${box.y} ${box.width} ${box.height}"><path d="${path}"/></svg><div class="name">Jx Finance</div></div>
<div class="tagline">A private household ledger you run yourself</div>
</div>
<svg class="edge" width="1200" height="18"><defs><pattern id="teeth" width="36" height="18" patternUnits="userSpaceOnUse"><path d="M 0 0 H 36 L 18 18 Z" fill="${hero}"/></pattern></defs><rect width="1200" height="18" fill="url(#teeth)"/></svg>
<div class="foot"><span>Free and open source · Self-hosted</span><span>github.com/Justxs/Jx-Finance</span></div>
</div></body></html>`;
}

function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  for (const [index, { size, data }] of images.entries()) {
    const entry = 6 + index * 16;
    header.writeUInt8(size, entry);
    header.writeUInt8(size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  }
  return Buffer.concat([header, ...images.map((image) => image.data)]);
}

const path = birdPath("bird.svg");
const smallPath = birdPath("bird-small.svg");
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function measure(shape) {
  await page.setContent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><path d="${shape}"/></svg>`,
  );
  const box = await page.evaluate(() => {
    const { x, y, width, height } = document.querySelector("path").getBBox();
    return { x, y, width, height };
  });
  return {
    x: Math.floor(box.x),
    y: Math.floor(box.y),
    width: Math.ceil(box.width) + 1,
    height: Math.ceil(box.height) + 1,
  };
}

async function png(svg, size) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0">${svg.replace("<svg ", `<svg width="${size}" height="${size}" style="display:block" `)}</body>`,
  );
  return page.screenshot({ omitBackground: true });
}

const box = await measure(path);
const smallBox = await measure(smallPath);
const rounded = tileSvg(path, box, { radius: 10, share: 0.74 });
const smallRounded = tileSvg(smallPath, smallBox, { radius: 10, share: 0.74 });
const square = tileSvg(path, box, { radius: 0, share: 0.7 });
const maskable = tileSvg(path, box, { radius: 0, share: 0.56 });
const favicon = faviconSvg(smallPath, smallBox);

function viewBox({ x, y, width, height }) {
  return `${x} ${y} ${width} ${height}`;
}

writeFileSync(
  resolve(root, "src/components/brand/mark-paths.ts"),
  `export const markViewBox = "${viewBox(box)}";\n\nexport const markPath =\n  "${path}";\n\nexport const smallMarkViewBox = "${viewBox(smallBox)}";\n\nexport const smallMarkPath =\n  "${smallPath}";\n`,
);
writeFileSync(resolve(root, "public/favicon.svg"), favicon);
writeFileSync(resolve(root, "public/brand/mark.svg"), markSvg(path, box));
writeFileSync(resolve(root, "public/brand/mark-maskable.svg"), maskable);

writeFileSync(resolve(root, "public/brand/apple-touch-icon.png"), await png(square, 180));
writeFileSync(resolve(root, "public/brand/icon-192.png"), await png(rounded, 192));
writeFileSync(resolve(root, "public/brand/icon-512.png"), await png(rounded, 512));
writeFileSync(resolve(root, "public/brand/icon-maskable-512.png"), await png(maskable, 512));

const small = { size: 16, data: await png(smallRounded, 16) };
const medium = { size: 32, data: await png(smallRounded, 32) };
const large = { size: 48, data: await png(smallRounded, 48) };
writeFileSync(resolve(root, "public/favicon.ico"), ico([small, medium, large]));

const pdfMarkHeight = 192;
const pdfMarkWidth = Math.round((smallBox.width / smallBox.height) * pdfMarkHeight);
await page.setViewportSize({ width: pdfMarkWidth, height: pdfMarkHeight });
await page.setContent(
  `<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox(smallBox)}" width="${pdfMarkWidth}" height="${pdfMarkHeight}" style="display:block"><path fill="${navy}" d="${smallPath}"/></svg></body>`,
);
writeFileSync(
  resolve(root, "../backend/JxFinance.Api/Infrastructure/Pdf/brand-mark.png"),
  await page.screenshot({ omitBackground: true }),
);

const emailMarkHeight = 48;
const emailMarkWidth = Math.round((smallBox.width / smallBox.height) * emailMarkHeight);
await page.setViewportSize({ width: emailMarkWidth, height: emailMarkHeight });
await page.setContent(
  `<body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox(smallBox)}" width="${emailMarkWidth}" height="${emailMarkHeight}" style="display:block"><path fill="${paper}" d="${smallPath}"/></svg></body>`,
);
writeFileSync(
  resolve(root, "../backend/JxFinance.Api/Infrastructure/Email/email-mark.png"),
  await page.screenshot({ omitBackground: true }),
);

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(socialPreviewHtml(path, box));
await page.evaluate(() => document.fonts.ready);
writeFileSync(resolve(root, "public/brand/social-preview.png"), await page.screenshot());

await browser.close();
