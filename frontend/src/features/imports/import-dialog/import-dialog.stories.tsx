import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { accounts } from "@/storybook/fixtures";
import { ImportDialog } from "./import-dialog";

const meta = {
  title: "Features/Imports/ImportDialog",
  component: ImportDialog,
  parameters: { layout: "fullscreen" },
  args: { open: true, onOpenChange: () => undefined, accounts },
} satisfies Meta<typeof ImportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Providers: Story = {};

export const SwedbankUpload: Story = {
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole("button", { name: /swedbank/i }));
    await expect(await body.findByText(/statement file|išrašo failas/i)).toBeVisible();
  },
};
