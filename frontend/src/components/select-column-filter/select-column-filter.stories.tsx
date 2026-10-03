import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { SelectColumnFilter } from "./select-column-filter";

type Kind = "income" | "expense";

const options = [
  { value: "" as const, label: "Any type" },
  { value: "income" as const, label: "Income" },
  { value: "expense" as const, label: "Expense" },
];

function TypeFilterExample({ initialValue = "" }: Readonly<{ initialValue?: Kind | "" }>) {
  const [value, setValue] = useState<Kind | "">(initialValue);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span>Type</span>
      <SelectColumnFilter label="Type" value={value} options={options} onChange={setValue} />
      <span className="text-muted-foreground">Applied: {value || "none"}</span>
    </div>
  );
}

const meta = {
  title: "Components/SelectColumnFilter",
  component: SelectColumnFilter,
} satisfies Meta<typeof SelectColumnFilter>;

export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <TypeFilterExample /> };

export const Active: Story = {
  render: () => <TypeFilterExample initialValue="expense" />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Filter by Type (now: Expense)" }));
    const popup = await within(document.body).findByRole("dialog", { name: "Type" });
    await userEvent.click(within(popup).getByRole("button", { name: "Clear" }));
    await expect(await canvas.findByText("Applied: none")).toBeInTheDocument();
  },
};
