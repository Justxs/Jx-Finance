import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { toast } from "sonner";
import { expect, within } from "storybook/test";
import type { TransactionResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import { accounts, categories, splitTransaction, tags, transactions } from "@/storybook/fixtures";
import { TransactionFormSection } from "./transaction-form-section";

interface HarnessProps {
  initialCreateOpen?: boolean;
  initialEditing?: TransactionResponse | null;
  createPending?: boolean;
  updatePending?: boolean;
}

function FormSectionHarness({
  initialCreateOpen = false,
  initialEditing = null,
  createPending = false,
  updatePending = false,
}: Readonly<HarnessProps>) {
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [editing, setEditing] = useState<TransactionResponse | null>(initialEditing);

  return (
    <div className="flex gap-2">
      <Button onClick={() => setCreateOpen(true)}>Add transaction</Button>
      <Button variant="outline" onClick={() => setEditing(splitTransaction)}>
        Edit split transaction
      </Button>
      <TransactionFormSection
        accounts={accounts}
        categories={categories}
        tags={tags}
        createOpen={createOpen}
        onCreateOpenChange={setCreateOpen}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        createPending={createPending}
        updatePending={updatePending}
        onCreate={() => {
          toast.success("Created");
          setCreateOpen(false);
        }}
        onCreateAnother={async () => {
          toast.success("Created");
          return true;
        }}
        onUpdate={() => {
          toast.success("Updated");
          setEditing(null);
        }}
      />
    </div>
  );
}

const meta = {
  title: "Features/Transactions/TransactionFormSection",
  component: FormSectionHarness,
} satisfies Meta<typeof FormSectionHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const CreateOpen: Story = { args: { initialCreateOpen: true } };

export const EditOpen: Story = {
  args: { initialEditing: transactions[0] },
  play: async () => {
    const dialog = within(await within(document.body).findByRole("dialog"));
    await expect(await dialog.findByRole("heading", { name: "Receipts and files" })).toBeVisible();
    await expect(await dialog.findByText("maxima-kvitas.jpg")).toBeVisible();
  },
};

export const EditSplitOpen: Story = { args: { initialEditing: splitTransaction } };

export const CreatePending: Story = { args: { initialCreateOpen: true, createPending: true } };

export const UpdatePending: Story = {
  args: { initialEditing: transactions[0], updatePending: true },
};
