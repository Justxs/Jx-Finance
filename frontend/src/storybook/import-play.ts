import { userEvent, within } from "storybook/test";
import type { StatementFormat } from "@/api/generated/model";
import { IMPORT_FILE_INPUT_ID } from "@/features/imports/import-section/import-upload-form";
import { camtStatementXml, revolutCsv, transactionsCsv } from "./fixtures";

const sampleFiles = {
  swedbankCsv: { name: "swedbank-2026-09.csv", type: "text/csv", content: transactionsCsv },
  camt053: { name: "statement-2026-09.xml", type: "application/xml", content: camtStatementXml },
  genericCsv: { name: "revolut-2026-09.csv", type: "text/csv", content: revolutCsv },
} satisfies Record<StatementFormat, { name: string; type: string; content: string }>;

export async function uploadAndPreview(
  canvasElement: HTMLElement,
  content?: string,
  format: StatementFormat = "swedbankCsv",
) {
  const canvas = within(canvasElement);
  const previewButton = await canvas.findByRole("button", { name: /^(preview|peržiūra)$/i });
  const fileInput = canvasElement.querySelector<HTMLInputElement>(`#${IMPORT_FILE_INPUT_ID}`);
  if (!fileInput) {
    return;
  }
  const sample = sampleFiles[format];
  const file = new File([content ?? sample.content], sample.name, { type: sample.type });
  await userEvent.upload(fileInput, file);
  await userEvent.click(previewButton);
}
