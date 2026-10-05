import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import type { CategoryResponse, Currency } from "@/api/generated/model";
import { useAppForm } from "@/components/form";
import { categories, splitTransactionLines } from "@/storybook/fixtures";
import type { LineFormValue } from "./line-form-value";
import { SplitLinesEditor } from "./split-lines-editor";
import type { TransactionFormType } from "./transaction-schema";

interface HarnessProps {
  type?: TransactionFormType;
  amount?: string;
  isSplit?: boolean;
  lines?: LineFormValue[];
  categories?: CategoryResponse[];
}

const currency: Currency = "eur";

const fixtureLines: LineFormValue[] = splitTransactionLines.map((line) => ({
  id: line.id ?? "",
  categoryId: line.categoryId ?? "",
  amount: line.amount ?? "",
  description: line.description ?? "",
}));

const manyLines: LineFormValue[] = Array.from({ length: 8 }, (_, index) => ({
  id: `line-${index}`,
  categoryId: "",
  amount: `${(index + 1) * 3}.50`,
  description: `Receipt item ${index + 1} with a fairly long note describing what was bought and why`,
}));

function SplitLinesHarness({
  type = "expense",
  amount = "",
  isSplit = true,
  lines = fixtureLines,
  categories: categoryList = categories,
}: Readonly<HarnessProps>) {
  const form = useAppForm({
    defaultValues: {
      type,
      accountId: "",
      categoryId: "",
      amount,
      currency,
      date: "2026-09-18",
      description: "",
      isSplit,
      lines,
    },
  });

  return (
    <div className="w-[min(42rem,90vw)]">
      <SplitLinesEditor
        form={form}
        fields={{
          type: "type",
          amount: "amount",
          currency: "currency",
          isSplit: "isSplit",
          lines: "lines",
        }}
        categories={categoryList}
      />
    </div>
  );
}

const meta = {
  title: "Features/Transactions/SplitLinesEditor",
  component: SplitLinesHarness,
} satisfies Meta<typeof SplitLinesHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoLines: Story = { args: { lines: [] } };

export const BalancesAgainstTheTotal: Story = {
  args: {
    amount: "75",
    lines: [
      { id: "groceries", categoryId: "", amount: "52", description: "" },
      { id: "rest", categoryId: "", amount: "", description: "" },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Transaction €75\.00 · Assigned €52\.00/u)).toBeVisible();
    await expect(canvas.getByText("€23.00 remaining")).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Use remaining €23.00" }));

    await expect(canvas.getByRole("textbox", { name: "Amount, line 2" })).toHaveValue("23.00");
    await expect(canvas.getByText("Fully assigned")).toBeVisible();
  },
};

export const OverAssigned: Story = {
  args: {
    amount: "10",
    lines: [{ id: "only", categoryId: "", amount: "12.50", description: "" }],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("€2.50 over")).toHaveClass("text-expense");
  },
};

export const ManyLines: Story = { args: { lines: manyLines } };

export const IncomeCategories: Story = { args: { type: "income", lines: manyLines.slice(0, 2) } };

export const NoCategories: Story = { args: { categories: [] } };

export const NotSplit: Story = {
  args: { isSplit: false },
  render: (args) => (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        The editor renders nothing until the transaction is marked as split.
      </p>
      <SplitLinesHarness {...args} />
    </div>
  ),
};
