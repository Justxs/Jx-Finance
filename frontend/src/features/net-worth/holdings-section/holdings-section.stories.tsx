import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { Button } from "@/components/ui/button/button";
import { withWidth } from "@/storybook/decorators";
import { openedDialog } from "@/storybook/interactions";
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

function holding(id: string, name: string, details: string, amount: number): HoldingItem {
  return {
    id,
    name,
    details,
    amount,
    values: {
      name,
      type: "other",
      amount: amount.toFixed(2),
      interestRate: "",
      asOf: "2026-09-01",
    },
  };
}

const items: HoldingItem[] = [
  holding("1", "Apartment in Zirmunai", "Real estate · Sep 1, 2026", 145000),
  holding("2", "Index fund portfolio", "Investment · Sep 1, 2026", 38250.4),
  holding(
    "3",
    "A holding with a very long name that has to wrap onto a second line in narrow layouts",
    "Other · Sep 1, 2026",
    1200,
  ),
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
    undoKind: "asset",
    form: StubForm,
  },
  decorators: [withWidth("wide")],
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
    await openedDialog();
  },
};
