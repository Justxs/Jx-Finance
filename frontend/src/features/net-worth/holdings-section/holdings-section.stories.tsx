import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Button } from "@/components/ui/button";
import { type HoldingFormProps, type HoldingItem, HoldingsSection } from "./holdings-section";

function StubForm({ onCreated, onCancel }: Readonly<HoldingFormProps>) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button onClick={onCreated}>Add</Button>
    </div>
  );
}

const items: HoldingItem[] = [
  { id: "1", name: "Apartment in Zirmunai", details: "Real estate · Sep 1, 2026", amount: 145000 },
  { id: "2", name: "Index fund portfolio", details: "Investment · Sep 1, 2026", amount: 38250.4 },
  {
    id: "3",
    name: "A holding with a very long name that has to wrap onto a second line in narrow layouts",
    details: "Other · Sep 1, 2026",
    amount: 1200,
  },
];

const meta = {
  title: "Features/NetWorth/HoldingsSection",
  component: HoldingsSection,
  args: {
    title: "Assets",
    addLabel: "Add asset",
    emptyLabel: "No assets yet.",
    items,
    deleteDisabled: false,
    onDelete: fn(),
    onCreated: fn(),
    form: StubForm,
  },
  decorators: [
    function withSectionWidth(Story) {
      return (
        <div className="w-[min(48rem,calc(100vw-3rem))]">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof HoldingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExpenseTone: Story = {
  args: { title: "Debts", addLabel: "Add debt", tone: "expense" },
};

export const Empty: Story = { args: { items: [] } };

export const DeletePending: Story = { args: { deletingId: "2", deleteDisabled: true } };

export const AddDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Add asset" }));
    await expect(await within(document.body).findByRole("dialog")).toBeVisible();
  },
};
