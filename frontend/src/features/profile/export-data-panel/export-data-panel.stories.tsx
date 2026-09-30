import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { getImportMyDataMockHandler } from "@/api/generated/users/users.msw";
import { withWidth } from "@/storybook/decorators";
import { importTargetNotEmptyProblem } from "@/storybook/fixtures";
import { failWith, withHandlers } from "@/storybook/handlers";
import { ExportDataPanel, IMPORT_FILE_INPUT_ID } from "./export-data-panel";

const meta = {
  title: "Features/Profile/ExportDataPanel",
  component: ExportDataPanel,
  decorators: [withWidth("panel")],
} satisfies Meta<typeof ExportDataPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

async function importFile() {
  const fileInput = document.querySelector<HTMLInputElement>(`#${IMPORT_FILE_INPUT_ID}`);
  if (!fileInput) {
    throw new Error("The import file input is missing.");
  }
  await userEvent.upload(
    fileInput,
    new File(["PK"], "jx-finance-export-2026-09-18.zip", { type: "application/zip" }),
  );
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Download my data" })).toHaveAttribute(
      "href",
      "/api/users/me/export",
    );
    await expect(
      canvas.getByRole("checkbox", { name: "Include attached files" }),
    ).not.toBeChecked();
  },
};

export const WithAttachments: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("checkbox", { name: "Include attached files" }));

    await expect(canvas.getByRole("link", { name: "Download my data" })).toHaveAttribute(
      "href",
      "/api/users/me/export?attachments=true",
    );
  },
};

export const Imported: Story = {
  play: async ({ canvas }) => {
    await importFile();
    await userEvent.click(canvas.getByRole("button", { name: "Import my data" }));

    const status = await canvas.findByRole("status");
    await expect(status).toHaveTextContent("Imported 4812 records and 36 attached files.");
    await expect(status).toHaveTextContent(
      "Records left out because they pointed at data outside the file: 3.",
    );
  },
};

export const ImportWithoutFile: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Import my data" }));

    await expect(await canvas.findByText("Choose the zip file first.")).toBeVisible();
  },
};

export const ImportIntoLedgerWithData: Story = {
  parameters: withHandlers(getImportMyDataMockHandler(failWith(importTargetNotEmptyProblem))),
  play: async ({ canvas }) => {
    await importFile();
    await userEvent.click(canvas.getByRole("button", { name: "Import my data" }));

    await expect(
      await canvas.findByText(
        "You already have accounts or tags. Import into a new, empty member instead.",
      ),
    ).toBeVisible();
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
