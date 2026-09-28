import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor } from "storybook/test";
import { accounts, ids } from "@/storybook/fixtures";
import { uploadAndPreview } from "@/storybook/import-play";
import { first, openedDialog } from "@/storybook/interactions";
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
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /swedbank/i }));
    await expect(await screen.findByText(/statement file|išrašo failas/i)).toBeVisible();
  },
};

export const XmlStatementUpload: Story = {
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /iso 20022/i }));
    await expect(await screen.findByText(/camt\.053/i)).toBeVisible();
  },
};

export const PreselectedAccount: Story = {
  args: { initialAccountId: ids.accounts.savings },
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /swedbank/i }));
  },
};

export const DiscardEditedReview: Story = {
  play: async () => {
    await userEvent.click(await screen.findByRole("button", { name: /swedbank/i }));
    await uploadAndPreview(await openedDialog());
    const rows = await screen.findAllByRole("checkbox", { name: /^(select|pasirinkti): /i });
    await userEvent.click(first(rows));
    await userEvent.click(screen.getByRole("button", { name: /all providers|visi teikėjai/i }));
    const confirm = await openedDialog("alertdialog");
    await expect(confirm).toHaveTextContent(/discard this review|atmesti šią peržiūrą/i);
    await userEvent.click(screen.getByRole("button", { name: /^(cancel|atšaukti)$/i }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await expect(
      screen.getByRole("region", { name: /review rows|eilučių peržiūra/i }),
    ).toBeVisible();
  },
};
