import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { withPageFrame } from "@/storybook/decorators";
import { accounts, brokerAccount } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { first, openedDialog } from "@/storybook/interactions";
import { ConversionsSection } from "./conversions-section";

const meta = {
  title: "Features/Accounts/ConversionsSection",
  component: ConversionsSection,
  parameters: { layout: "fullscreen" },
  args: { accounts, convertAccountId: null, onConvertAccountChange: fn() },
  decorators: [withPageFrame],
} satisfies Meta<typeof ConversionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const FormOpen: Story = { args: { convertAccountId: brokerAccount.id } };

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const NoAccounts: Story = { args: { accounts: [] } };

export const ImportedRowHasNoEdit: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(
        "Imported from the broker. Correct it at the broker and import again.",
      ),
    ).toBeVisible();
    await expect(canvas.getAllByRole("button", { name: /^Edit: /u })).toHaveLength(2);
    await expect(canvas.getAllByRole("button", { name: /^Delete: /u })).toHaveLength(3);
  },
};

export const EditsConversion: Story = {
  play: async ({ canvas }) => {
    const edit = first(await canvas.findAllByRole("button", { name: /^Edit: /u }));
    await userEvent.click(edit);

    const dialog = within(await openedDialog());
    await expect(dialog.getByLabelText("Sold")).toHaveValue("2500.00");
    await fireEvent.change(dialog.getByLabelText("Bought"), { target: { value: "2712.00" } });
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};
