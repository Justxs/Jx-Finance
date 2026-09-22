import { expect, test } from "vitest";
import { validateUpload } from "./upload-file";

test("reports a missing, empty or oversized file and accepts one within the limit", () => {
  expect(validateUpload(undefined, 4)).toBe("required");
  expect(validateUpload(new Blob([]), 4)).toBe("empty");
  expect(validateUpload(new Blob(["abcde"]), 4)).toBe("tooLarge");
  expect(validateUpload(new Blob(["abcd"]), 4)).toBeNull();
});
