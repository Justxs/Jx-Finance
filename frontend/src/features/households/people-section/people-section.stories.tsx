import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { withWidth } from "@/storybook/decorators";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { first, openedDialog } from "@/storybook/interactions";
import { PeopleSection, PeopleSkeleton } from "./people-section";

const meta = {
  title: "Features/Households/PeopleSection",
  component: PeopleSection,
  parameters: { layout: "padded", route: "/households" },
  decorators: [withWidth("panel")],
  render: () => (
    <QueryBoundary fallback={<PeopleSkeleton />}>
      <PeopleSection />
    </QueryBoundary>
  ),
} satisfies Meta<typeof PeopleSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Jonas")).toBeVisible();
    await expect(canvas.getByText(/^Owes you €42\.50 · You owe \S*12\.00$/u)).toBeVisible();
    await expect(canvas.getByText("You owe €15.00")).toBeVisible();
    await expect(canvas.getByText("Even")).toBeVisible();
  },
};

export const RecordPayment: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(first(await canvas.findAllByRole("button", { name: "Record payment" })));
    const dialog = await openedDialog();
    await expect(within(dialog).getByText("Record payment with Jonas")).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  },
};

export const ShowHistory: Story = {
  play: async ({ canvas }) => {
    const toggle = first(await canvas.findAllByRole("button", { name: "Show history" }));
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(await canvas.findByText("Vakarienė Senamiestyje")).toBeVisible();
  },
};

export const DeleteOffersUndo: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Delete: Tomas" }));
    const dialog = await openedDialog("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete/i }));
    await expect(await screen.findByRole("button", { name: "Undo" })).toBeInTheDocument();
  },
};

export const Empty: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^No people yet\./u)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Add person" })).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const Failed: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Phone: Story = {
  decorators: [withWidth("w-[343px]")],
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
