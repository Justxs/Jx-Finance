import { useForm } from "@tanstack/react-form";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { CategoryResponse, FlowType } from "@/api/generated/model";
import { categories, splitTransactionLines } from "@/storybook/fixtures";
import { SplitLinesEditor } from "./split-lines-editor";
import type { LineFormValue, TransactionFormApi } from "./transaction-form";

interface HarnessProps {
  type?: FlowType;
  isSplit?: boolean;
  lines?: LineFormValue[];
  categories?: CategoryResponse[];
}

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
  isSplit = true,
  lines = fixtureLines,
  categories: categoryList = categories,
}: Readonly<HarnessProps>) {
  const form = useForm({
    defaultValues: {
      type,
      accountId: "",
      categoryId: "",
      amount: "",
      date: "2026-09-18",
      description: "",
      isSplit,
      lines,
    },
  });

  return (
    <div className="w-[min(42rem,90vw)]">
      <SplitLinesEditor form={form as unknown as TransactionFormApi} categories={categoryList} />
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
