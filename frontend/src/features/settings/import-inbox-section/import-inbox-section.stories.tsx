import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { getImportInboxStatusMockHandler } from "@/api/generated/imports/imports.msw";
import { importInboxOff, importInboxQuiet, importInboxStatus } from "@/storybook/fixtures";
import { failWithStatus, pending, withHandlers } from "@/storybook/handlers";
import { ImportInboxSection } from "./import-inbox-section";

const meta = {
  title: "Features/Settings/ImportInboxSection",
  component: ImportInboxSection,
  parameters: { layout: "padded", route: "/settings" },
} satisfies Meta<typeof ImportInboxSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Failures: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("/import-inbox")).toBeVisible();
    const table = within(canvas.getByRole("region", { name: "Files the inbox could not use" }));
    const [, ...rows] = table.getAllByRole("row");
    await expect(rows.map((row) => row.textContent)).toEqual(
      importInboxStatus.failures.map((failure) =>
        expect.stringContaining(`${failure.fileName}${failure.reason}`),
      ),
    );
  },
};

export const NoFailures: Story = {
  parameters: withHandlers(getImportInboxStatusMockHandler(importInboxQuiet)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("/import-inbox")).toBeVisible();
    await expect(canvas.getByText("No failures")).toBeVisible();
    await expect(canvas.queryByRole("table")).toBeNull();
  },
};

export const Off: Story = {
  parameters: withHandlers(getImportInboxStatusMockHandler(importInboxOff)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^The inbox is off\./u)).toBeVisible();
    await expect(canvas.queryByText("Watching")).toBeNull();
    await expect(canvas.queryByText("Files the inbox could not use")).toBeNull();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getImportInboxStatusMockHandler(pending)),
};

export const ServerError: Story = {
  parameters: withHandlers(getImportInboxStatusMockHandler(failWithStatus(500))),
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
