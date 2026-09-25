import type { AttachmentResponse } from "@/api/generated/model";
import { ids, uid } from "./base";
import { problemOf } from "./problems";
import { currentUser, memberUser } from "./users";

function attachment(
  index: number,
  transactionId: string,
  fileName: string,
  contentType: string,
  sizeBytes: number,
  uploadedAt: string,
  uploader: "ruta" | "sarunas" = "ruta",
): AttachmentResponse {
  const user = uploader === "ruta" ? currentUser : memberUser;
  return {
    id: uid("a77ac4ed", index),
    transactionId,
    fileName,
    contentType,
    sizeBytes,
    sha256: index.toString(16).padStart(64, "0"),
    uploadedById: user.id,
    uploadedByName: user.displayName,
    uploadedAt,
  };
}

export const maximaAttachments: AttachmentResponse[] = [
  attachment(
    1,
    ids.transactions.maxima,
    "maxima-kvitas.jpg",
    "image/jpeg",
    684_211,
    "2026-09-17T18:40:00Z",
  ),
];

export const splitAttachments: AttachmentResponse[] = [
  attachment(
    2,
    ids.transactions.split,
    "Maxima Akropolis 2026-09-13 – sąskaita faktūra su ilgu pavadinimu.pdf",
    "application/pdf",
    1_204_882,
    "2026-09-13T15:02:00Z",
  ),
  attachment(
    3,
    ids.transactions.split,
    "IMG_4812.heic",
    "image/heic",
    2_904_115,
    "2026-09-13T15:05:00Z",
    "sarunas",
  ),
];

export const fullAttachments: AttachmentResponse[] = Array.from({ length: 10 }, (_, index) =>
  attachment(
    20 + index,
    ids.transactions.maxima,
    `kvitas-${index + 1}.png`,
    "image/png",
    120_000 + index * 1000,
    "2026-09-17T18:40:00Z",
  ),
);

export const attachmentContentMismatchProblem = problemOf(
  400,
  "attachment.contentMismatch",
  "The file's content does not match its type.",
  { instance: `/api/transactions/${ids.transactions.maxima}/attachments` },
);

export const tinyPng = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0xf8, 0xcf, 0xc0, 0xf0,
  0x1f, 0x00, 0x05, 0x00, 0x01, 0xff, 0x89, 0x99, 0x3d, 0x1d, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
