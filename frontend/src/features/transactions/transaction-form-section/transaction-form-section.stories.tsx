import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getLedgerQueryKey } from "@/api/generated";
import {
  getCreateTransactionMockHandler,
  getUpdateTransactionMockHandler,
} from "@/api/generated/transactions/transactions.msw";
import { Button } from "@/components/ui/button/button";
import { useTransactionMutations } from "@/features/transactions/transactions-page/use-transaction-mutations";
import { nameById } from "@/lib/options";
import { accounts, categories, splitTransaction, tags, transactions } from "@/storybook/fixtures";
import { pending, withHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { useTransactionFormSection } from "./transaction-form-section";

const offerRule = fn();

function FormSectionHarness() {
  const mutations = useTransactionMutations({
    listKey: getLedgerQueryKey(),
    accountNames: nameById(accounts),
    onBulkApplied: fn(),
  });
  const section = useTransactionFormSection({
    accounts,
    categories,
    tags,
    mutations,
    onCategorized: offerRule,
  });

  return (
    <div className="flex gap-2">
      <Button onClick={section.startBlank}>Add transaction</Button>
      <Button variant="outline" onClick={() => section.startEditing(transactions[0]!)}>
        Edit transaction
      </Button>
      <Button variant="outline" onClick={() => section.startEditing(splitTransaction)}>
        Edit split transaction
      </Button>
      {section.dialogs}
    </div>
  );
}

const meta = {
  title: "Features/Transactions/TransactionFormSection",
  component: FormSectionHarness,
  parameters: { route: "/transactions" },
} satisfies Meta<typeof FormSectionHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const CreateOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add transaction" }));
    await expect(await openedDialog()).toHaveTextContent("Add transaction");
  },
};

export const EditOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit transaction" }));
    const dialog = within(await openedDialog());
    await expect(await dialog.findByRole("heading", { name: "Receipts and files" })).toBeVisible();
    await expect(await dialog.findByText("maxima-kvitas.jpg")).toBeVisible();
  },
};

export const EditSplitOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit split transaction" }));
    await expect(await openedDialog()).toHaveTextContent("Split into categories");
  },
};

export const CreatePending: Story = {
  parameters: withHandlers(getCreateTransactionMockHandler(pending)),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add transaction" }));
    const dialog = within(await openedDialog());
    await fireEvent.change(await dialog.findByLabelText("Amount"), { target: { value: "12,50" } });
    const add = dialog.getByRole("button", { name: "Add" });
    await waitFor(() => expect(add).toBeEnabled());
    await userEvent.click(add);
    await waitFor(() => expect(add).toHaveAttribute("aria-busy", "true"));
  },
};

export const UpdatePending: Story = {
  parameters: withHandlers(getUpdateTransactionMockHandler(pending)),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Edit transaction" }));
    const dialog = within(await openedDialog());
    const save = await dialog.findByRole("button", { name: "Save" });
    await userEvent.click(save);
    await waitFor(() => expect(save).toHaveAttribute("aria-busy", "true"));
  },
};
