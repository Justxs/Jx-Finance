import {
  getAttachmentsMockHandler,
  getDeleteAttachmentMockHandler,
  getDownloadAttachmentMockHandler,
  getUploadAttachmentMockHandler,
} from "@/api/generated/attachments/attachments.msw";
import type { AttachmentResponse } from "@/api/generated/model";
import {
  currentUser,
  ids,
  maximaAttachments,
  splitAttachments,
  tinyPng,
} from "@/storybook/fixtures";
import { CREATED_AT } from "./ids";

const byTransaction: Record<string, AttachmentResponse[]> = {
  [ids.transactions.maxima]: maximaAttachments,
  [ids.transactions.split]: splitAttachments,
};

export function uploadedAttachment(transactionId: string, file: File): AttachmentResponse {
  return {
    id: crypto.randomUUID(),
    transactionId,
    fileName: file.name,
    contentType: file.type || "application/pdf",
    sizeBytes: file.size,
    sha256: "0".repeat(64),
    uploadedById: currentUser.id,
    uploadedByName: currentUser.displayName,
    uploadedAt: CREATED_AT,
  };
}

export async function readUpload(request: Request): Promise<File | null> {
  const form = await request.clone().formData();
  const file = form.get("file");
  return file instanceof File ? file : null;
}

export const attachmentHandlers = [
  getAttachmentsMockHandler(({ params }) => byTransaction[String(params.transactionId)] ?? []),
  getUploadAttachmentMockHandler(async ({ params, request }) => {
    const file = await readUpload(request);
    return uploadedAttachment(
      String(params.transactionId),
      file ?? new File([], "attachment.pdf", { type: "application/pdf" }),
    );
  }),
  getDeleteAttachmentMockHandler(),
  getDownloadAttachmentMockHandler(tinyPng.slice().buffer),
];
