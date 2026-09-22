import { userEvent, within } from "storybook/test";
import { IMPORT_FILE_INPUT_ID } from "@/features/imports/import-section/import-upload-form";
import { transactionsCsv } from "./fixtures";

export async function uploadAndPreview(canvasElement: HTMLElement, content = transactionsCsv) {
  const canvas = within(canvasElement);
  const previewButton = await canvas.findByRole("button", { name: /^(preview|peržiūra)$/i });
  const fileInput = canvasElement.querySelector<HTMLInputElement>(`#${IMPORT_FILE_INPUT_ID}`);
  if (!fileInput) {
    return;
  }
  const file = new File([content], "swedbank-2026-09.csv", { type: "text/csv" });
  await userEvent.upload(fileInput, file);
  await userEvent.click(previewButton);
}
