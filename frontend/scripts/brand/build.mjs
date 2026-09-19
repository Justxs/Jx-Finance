import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const navy = "#253e52";
const paper = "#fbfbfc";
const paleBlue = "#a6c5dc";

function birdPath() {
  const source = readFileSync(resolve(root, "scripts/brand/bird.svg"), "utf8");
  const match = /<path[^>]*\sd="([^"]+)"/.exec(source);
  if (!match) {
    throw new Error("bird.svg has no path");
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
  return `<path fill-rule="evenodd" transform="translate(${round(x)} ${round(y)}) scale(${round(scale * 10000) / 10000})" d="${path}"`;
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
  <path fill="${navy}" fill-rule="evenodd" d="${path}"/>
</svg>
`;
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

const path = birdPath();
const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

async function measure() {
  await page.setContent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><path d="${path}"/></svg>`,
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

const box = await measure();
const rounded = tileSvg(path, box, { radius: 10, share: 0.74 });
const square = tileSvg(path, box, { radius: 0, share: 0.7 });
const maskable = tileSvg(path, box, { radius: 0, share: 0.56 });
const favicon = faviconSvg(path, box);

writeFileSync(
  resolve(root, "src/components/brand/mark-paths.ts"),
  `export const markViewBox = "${box.x} ${box.y} ${box.width} ${box.height}";\n\nexport const markPath =\n  "${path}";\n`,
);
writeFileSync(resolve(root, "public/favicon.svg"), favicon);
writeFileSync(resolve(root, "public/brand/mark.svg"), markSvg(path, box));
writeFileSync(resolve(root, "public/brand/mark-maskable.svg"), maskable);
copyFileSync(resolve(root, "public/favicon.svg"), resolve(root, ".storybook/public/favicon.svg"));

writeFileSync(resolve(root, "public/brand/apple-touch-icon.png"), await png(square, 180));
writeFileSync(resolve(root, "public/brand/icon-192.png"), await png(rounded, 192));
writeFileSync(resolve(root, "public/brand/icon-512.png"), await png(rounded, 512));
writeFileSync(resolve(root, "public/brand/icon-maskable-512.png"), await png(maskable, 512));

const small = { size: 16, data: await png(rounded, 16) };
const medium = { size: 32, data: await png(rounded, 32) };
const large = { size: 48, data: await png(rounded, 48) };
writeFileSync(resolve(root, "public/favicon.ico"), ico([small, medium, large]));

await browser.close();
