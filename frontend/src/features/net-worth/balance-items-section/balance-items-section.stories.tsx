import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { Button } from "@/components/ui/button/button";
import { withWidth } from "@/storybook/decorators";
import { familyHousehold } from "@/storybook/fixtures";
import { openedDialog } from "@/storybook/interactions";
import {
  type BalanceItem,
  type BalanceItemFormProps,
  BalanceItemsSection,
} from "./balance-items-section";

function StubForm({ onClose }: Readonly<BalanceItemFormProps<unknown>>) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button onClick={onClose}>Add</Button>
    </div>
  );
}

function balanceItem(
  id: string,
  name: string,
  details: string,
  amount: number,
): BalanceItem<unknown> {
  return { id, name, details, amount, currency: "eur", record: { id, name } };
}

const items: BalanceItem<unknown>[] = [
  balanceItem("1", "Apartment in Zirmunai", "Real estate · Sep 1, 2026", 145000),
  balanceItem("2", "Index fund portfolio", "Investment · Sep 1, 2026", 38250.4),
  balanceItem(
    "3",
    "An item with a very long name that has to wrap onto a second line in narrow layouts",
    "Other · Sep 1, 2026",
    1200,
  ),
];

const meta = {
  title: "Features/NetWorth/BalanceItemsSection",
  component: BalanceItemsSection,
  args: {
    title: "Assets",
    addLabel: "Add asset",
    emptyLabel: "No assets yet.",
    items,
    deleteMutation: { mutate: fn(), isPending: false },
    undoKind: "asset",
    form: StubForm,
  },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof BalanceItemsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExpenseTone: Story = {
  args: { title: "Debts", addLabel: "Add debt", tone: "expense" },
};

export const Empty: Story = { args: { items: [] } };

export const DeletePending: Story = {
  args: { deleteMutation: { mutate: fn(), isPending: true, variables: { id: "2" } } },
};

export const AddDialogOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add asset" }));
    await openedDialog();
  },
};

export const SharedWithHousehold: Story = {
  args: {
    items: [
      { ...items[0]!, scope: "shared", householdId: familyHousehold.id },
      { ...items[1]!, scope: "personal", householdId: null },
    ],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(`Shared · ${familyHousehold.name}`)).toBeVisible();
  },
};
