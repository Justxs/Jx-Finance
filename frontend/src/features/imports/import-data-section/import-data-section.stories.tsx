import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getListImportInboxMockHandler } from "@/api/generated/imports/imports.msw";
import { withWidth } from "@/storybook/decorators";
import { inboxFiles } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { first, openedDialog } from "@/storybook/interactions";
import { ImportDataSection } from "./import-data-section";

const meta = {
  title: "Features/Imports/ImportDataSection",
  component: ImportDataSection,
  decorators: [withWidth("panel")],
} satisfies Meta<typeof ImportDataSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("button", { name: "Import bank statement" }),
    ).toBeVisible();
    await expect(canvas.queryByText(/waiting for review/u)).toBeNull();
  },
};

export const StatementsWaiting: Story = {
  parameters: withHandlers(getListImportInboxMockHandler(inboxFiles)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("2 bank statements are waiting for review."),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Import bank statement" }));
    const dialog = within(await openedDialog());
    await expect(
      await dialog.findByRole("region", { name: "Waiting in the inbox" }),
    ).toHaveTextContent(first(inboxFiles).fileName);
  },
};

export const OneStatementWaiting: Story = {
  parameters: withHandlers(getListImportInboxMockHandler([first(inboxFiles)])),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("1 bank statement is waiting for review.")).toBeVisible();
  },
};

export const NoAccounts: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
