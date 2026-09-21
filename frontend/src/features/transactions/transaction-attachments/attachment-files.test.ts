import { expect, test } from "vitest";
import { MAX_ATTACHMENT_BYTES, isAcceptedFile, isPreviewable, sortFiles } from "./attachment-files";

function file(name: string, type: string, size = 10) {
  return new File([new Uint8Array(size)], name, { type });
}

test("images, PDFs and HEIC photos without a browser type are accepted", () => {
  expect(isAcceptedFile({ name: "a.jpg", type: "image/jpeg" })).toBe(true);
  expect(isAcceptedFile({ name: "a.pdf", type: "application/pdf" })).toBe(true);
  expect(isAcceptedFile({ name: "IMG_1.HEIC", type: "" })).toBe(true);
  expect(isAcceptedFile({ name: "scan.pdf", type: "application/octet-stream" })).toBe(true);
});

test("other types are refused even with a familiar extension", () => {
  expect(isAcceptedFile({ name: "page.html", type: "text/html" })).toBe(false);
  expect(isAcceptedFile({ name: "photo.png", type: "image/svg+xml" })).toBe(false);
  expect(isAcceptedFile({ name: "notes", type: "" })).toBe(false);
});

test("only JPEG, PNG and WebP get a thumbnail", () => {
  expect(isPreviewable("image/png")).toBe(true);
  expect(isPreviewable("image/heic")).toBe(false);
  expect(isPreviewable("application/pdf")).toBe(false);
});

test("files are sorted into accepted and refused, in order, up to the free slots", () => {
  const sorted = sortFiles(
    [
      file("a.png", "image/png"),
      file("b.txt", "text/plain"),
      file("c.png", "image/png", MAX_ATTACHMENT_BYTES + 1),
      file("d.pdf", "application/pdf"),
      file("e.pdf", "application/pdf"),
    ],
    2,
  );

  expect(sorted.accepted.map((f) => f.name)).toEqual(["a.png", "d.pdf"]);
  expect(sorted.refused).toEqual([
    { name: "b.txt", reason: "typeNotAllowed" },
    { name: "c.png", reason: "tooLarge" },
    { name: "e.pdf", reason: "tooMany" },
  ]);
});
