import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

const currencies = [
  { value: "EUR", label: "Euro" },
  { value: "USD", label: "US dollar" },
  { value: "GBP", label: "Pound sterling" },
];

const incomeItems = [
  { value: "salary", label: "Salary" },
  { value: "interest", label: "Interest" },
];

const expenseItems = [
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "household", label: "Household" },
];

const groupedItems = [...incomeItems, ...expenseItems, { value: "none", label: "Uncategorized" }];

const manyItems = Array.from({ length: 80 }, (_, index) => ({
  value: `item-${index}`,
  label: `Merchant ${index + 1}`,
}));

interface BasicProps {
  size?: "sm" | "default";
  disabled?: boolean;
  invalid?: boolean;
  initialValue?: string | null;
  alignItemWithTrigger?: boolean;
}

function BasicExample({
  size,
  disabled,
  invalid,
  initialValue = "EUR",
  alignItemWithTrigger,
}: Readonly<BasicProps>) {
  const [value, setValue] = useState<string | null>(initialValue);

  return (
    <Select items={currencies} value={value} onValueChange={setValue} disabled={disabled}>
      <SelectTrigger size={size} aria-label="Currency" aria-invalid={invalid} className="w-48">
        <SelectValue placeholder="Choose a currency" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={alignItemWithTrigger}>
        {currencies.map((item) => (
          <SelectItem key={item.value} value={item.value} disabled={item.value === "GBP"}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function GroupedExample() {
  const [value, setValue] = useState<string | null>("food");

  return (
    <Select items={groupedItems} value={value} onValueChange={setValue}>
      <SelectTrigger aria-label="Category" className="w-56">
        <SelectValue placeholder="Choose a category" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          <SelectLabel>Income</SelectLabel>
          {incomeItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Expenses</SelectLabel>
          {expenseItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
        <SelectSeparator />
        <SelectItem value="none">Uncategorized</SelectItem>
      </SelectContent>
    </Select>
  );
}

function ManyItemsExample() {
  const [value, setValue] = useState<string | null>("item-40");

  return (
    <Select items={manyItems} value={value} onValueChange={setValue}>
      <SelectTrigger aria-label="Merchant" className="w-56">
        <SelectValue placeholder="Choose a merchant" />
      </SelectTrigger>
      <SelectContent>
        {manyItems.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const meta = {
  title: "UI/Select",
  component: Select,
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <BasicExample /> };

export const Placeholder: Story = { render: () => <BasicExample initialValue={null} /> };

export const Small: Story = { render: () => <BasicExample size="sm" /> };

export const Disabled: Story = { render: () => <BasicExample disabled /> };

export const Invalid: Story = { render: () => <BasicExample initialValue={null} invalid /> };

export const PopupBelowTrigger: Story = {
  render: () => <BasicExample alignItemWithTrigger={false} />,
};

export const GroupsLabelsAndSeparators: Story = { render: () => <GroupedExample /> };

export const ManyItemsWithScrollButtons: Story = { render: () => <ManyItemsExample /> };
