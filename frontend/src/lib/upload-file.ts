export type UploadProblem = "required" | "empty" | "tooLarge";

export function validateUpload(file: Blob | undefined, maxBytes: number): UploadProblem | null {
  if (!file) {
    return "required";
  }
  if (file.size === 0) {
    return "empty";
  }
  if (file.size > maxBytes) {
    return "tooLarge";
  }
  return null;
}
