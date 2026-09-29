import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, within } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { familyHousehold, memberUser } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { SharedExpenses } from "./shared-expenses";

const meta = {
  title: "Features/Households/SharedExpenses",
  component: SharedExpenses,
  parameters: { layout: "padded", route: "/households" },
  args: { householdId: familyHousehold.id },
  decorators: [withWidth("panel")],
} satisfies Meta<typeof SharedExpenses>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Maxima, savaitės pirkiniai")).toBeVisible();
    await expect(canvas.getByText("Not counted while the transaction is deleted")).toBeVisible();
    await expect(
      await canvas.findByText(`${memberUser.displayName} paid Rūta Kazlauskienė`),
    ).toBeVisible();
    await expect(canvas.getAllByRole("button", { name: /^delete:/i })).toHaveLength(2);
  },
};

export const DeleteOffersUndo: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Delete: Maxima, savaitės pirkiniai" }),
    );
    const dialog = await openedDialog("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete/i }));
    await expect(await screen.findByRole("button", { name: "Undo" })).toBeInTheDocument();
  },
};

export const Empty: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Nothing has been split in this household yet."),
    ).toBeVisible();
    await expect(canvas.getByText("No payments have been recorded yet.")).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const Failed: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Lithuanian: Story = { globals: { locale: "lt" } };
