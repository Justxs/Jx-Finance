import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, within } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RecordRowsSkeleton } from "@/components/record-row/record-row";
import { withWidth } from "@/storybook/decorators";
import { contacts } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { ContactEntries } from "./contact-entries";

const meta = {
  title: "Features/Households/ContactEntries",
  component: ContactEntries,
  parameters: { layout: "padded", route: "/households" },
  args: { contact: contacts[0]! },
  decorators: [withWidth("panel")],
  render: (args) => (
    <QueryBoundary fallback={<RecordRowsSkeleton rows={2} />}>
      <ContactEntries {...args} />
    </QueryBoundary>
  ),
} satisfies Meta<typeof ContactEntries>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Vakarienė Senamiestyje")).toBeVisible();
    await expect(canvas.getByText("Jonas paid you")).toBeVisible();
    await expect(canvas.getByText("You paid Jonas")).toBeVisible();
    await expect(canvas.getByText("Not counted while the transaction is deleted")).toBeVisible();
    await expect(canvas.getAllByRole("button", { name: /^delete:/i })).toHaveLength(4);
  },
};

export const DeleteOffersUndo: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Delete: You paid Jonas" }));
    const dialog = await openedDialog("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete/i }));
    await expect(await screen.findByRole("button", { name: "Undo" })).toBeInTheDocument();
  },
};

export const Empty: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Nothing with Jonas yet.")).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const Failed: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Lithuanian: Story = { globals: { locale: "lt" } };
