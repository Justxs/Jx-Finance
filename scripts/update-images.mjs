import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const files = ["docker-compose.yml", "backend/JxFinance.Api/Dockerfile", "frontend/Dockerfile"];

const images = [
  { registry: "registry-1.docker.io", repository: "library/postgres", reference: "postgres", tags: /^16\.(\d+)$/ },
  { registry: "registry-1.docker.io", repository: "library/caddy", reference: "caddy", tags: /^2\.(\d+)\.(\d+)-alpine$/ },
  { registry: "registry-1.docker.io", repository: "library/node", reference: "node", tags: /^24\.(\d+)\.(\d+)-alpine$/ },
  { registry: "mcr.microsoft.com", repository: "dotnet/aspnet", reference: "mcr.microsoft.com/dotnet/aspnet", tags: /^10\.0\.(\d+)$/ },
  { registry: "mcr.microsoft.com", repository: "dotnet/sdk", reference: "mcr.microsoft.com/dotnet/sdk", tags: /^10\.0\.(\d+)$/ },
  { registry: "mcr.microsoft.com", repository: "dotnet/aspire-dashboard", reference: "mcr.microsoft.com/dotnet/aspire-dashboard", tags: /^13\.(\d+)(?:\.(\d+))?$/ },
];

const manifestTypes = [
  "application/vnd.oci.image.index.v1+json",
  "application/vnd.docker.distribution.manifest.list.v2+json",
  "application/vnd.oci.image.manifest.v1+json",
  "application/vnd.docker.distribution.manifest.v2+json",
].join(", ");

async function authorization(image) {
  if (image.registry !== "registry-1.docker.io") return {};
  const response = await fetch(`https://auth.docker.io/token?service=registry.docker.io&scope=repository:${image.repository}:pull`);
  if (!response.ok) throw new Error(`Token request for ${image.repository} answered ${response.status}`);
  const { token } = await response.json();
  return { Authorization: `Bearer ${token}` };
}

async function listTags(image, headers) {
  const tags = [];
  let url = `https://${image.registry}/v2/${image.repository}/tags/list?n=1000`;
  while (url) {
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Tag list for ${image.repository} answered ${response.status}`);
    tags.push(...((await response.json()).tags ?? []));
    const next = /<([^>]+)>;\s*rel="next"/.exec(response.headers.get("link") ?? "");
    url = next ? new URL(next[1], `https://${image.registry}`).toString() : null;
  }
  return tags;
}

function newest(image, tags) {
  const candidates = tags
    .map((tag) => ({ tag, match: image.tags.exec(tag) }))
    .filter((candidate) => candidate.match)
    .map((candidate) => ({ tag: candidate.tag, parts: candidate.match.slice(1).map((part) => Number(part ?? 0)) }));
  if (candidates.length === 0) throw new Error(`No tag of ${image.repository} matches ${image.tags}`);
  candidates.sort((a, b) => {
    for (let index = 0; index < a.parts.length; index++) {
      if (a.parts[index] !== b.parts[index]) return b.parts[index] - a.parts[index];
    }
    return b.tag.length - a.tag.length;
  });
  return candidates[0].tag;
}

async function digestOf(image, tag, headers) {
  const response = await fetch(`https://${image.registry}/v2/${image.repository}/manifests/${tag}`, {
    method: "HEAD",
    headers: { ...headers, Accept: manifestTypes },
  });
  const digest = response.headers.get("docker-content-digest");
  if (!response.ok || !/^sha256:[0-9a-f]{64}$/.test(digest ?? "")) {
    throw new Error(`Manifest of ${image.repository}:${tag} answered ${response.status} without a digest`);
  }
  return digest;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const contents = new Map(files.map((file) => [file, fs.readFileSync(path.join(root, file), "utf8")]));
let stale = 0;

for (const image of images) {
  const headers = await authorization(image);
  const tag = newest(image, await listTags(image, headers));
  const pinned = `${image.reference}:${tag}@${await digestOf(image, tag, headers)}`;
  const pattern = new RegExp(`(?<![\\w./-])${escapeRegExp(image.reference)}:[\\w.-]+@sha256:[0-9a-f]{64}`, "g");
  let found = false;
  for (const [file, text] of contents) {
    const updated = text.replace(pattern, (current) => {
      found = true;
      if (current !== pinned) {
        stale++;
        console.log(`${file}: ${current} -> ${pinned}`);
      }
      return pinned;
    });
    contents.set(file, updated);
  }
  if (!found) throw new Error(`No pinned reference to ${image.reference} found in ${files.join(", ")}`);
}

if (stale === 0) {
  console.log("Every pinned image is current.");
} else if (checkOnly) {
  console.log(`${stale} pinned image reference(s) are behind.`);
  process.exitCode = 1;
} else {
  for (const [file, text] of contents) fs.writeFileSync(path.join(root, file), text);
  console.log(`Updated ${stale} image reference(s). Rebuild and run 'just verify-production' before committing.`);
}
