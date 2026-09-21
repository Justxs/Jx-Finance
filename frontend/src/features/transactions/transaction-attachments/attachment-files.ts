export const MAX_ATTACHMENT_MEGABYTES = 10;
export const MAX_ATTACHMENT_BYTES = MAX_ATTACHMENT_MEGABYTES * 1024 * 1024;
export const MAX_ATTACHMENTS = 10;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
];

const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".pdf"];

const PREVIEWABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const ACCEPT_ATTRIBUTE = [...ACCEPTED_TYPES, ...ACCEPTED_EXTENSIONS].join(",");

export type RefusalReason = "tooLarge" | "typeNotAllowed" | "tooMany";

export interface Refusal {
  name: string;
  reason: RefusalReason;
}

export interface SortedFiles {
  accepted: File[];
  refused: Refusal[];
}

function hasAcceptedExtension(name: string) {
  const lower = name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function isAcceptedFile(file: Pick<File, "name" | "type">) {
  if (ACCEPTED_TYPES.includes(file.type)) {
    return true;
  }
  const unspecified = file.type === "" || file.type === "application/octet-stream";
  return unspecified && hasAcceptedExtension(file.name);
}

export function isPreviewable(contentType: string) {
  return PREVIEWABLE_TYPES.has(contentType);
}

export function sortFiles(files: readonly File[], free: number): SortedFiles {
  const accepted: File[] = [];
  const refused: Refusal[] = [];
  for (const file of files) {
    if (!isAcceptedFile(file)) {
      refused.push({ name: file.name, reason: "typeNotAllowed" });
    } else if (file.size > MAX_ATTACHMENT_BYTES) {
      refused.push({ name: file.name, reason: "tooLarge" });
    } else if (accepted.length >= free) {
      refused.push({ name: file.name, reason: "tooMany" });
    } else {
      accepted.push(file);
    }
  }
  return { accepted, refused };
}
