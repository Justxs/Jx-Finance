import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox } from "../checkbox/checkbox";
import { ColumnFilter, TextColumnFilter } from "./column-filter";

const typeNames = ["Income", "Expense", "Transfer"];

function TextFilterExample({
  initialValue = "",
  debounceMs,
}: Readonly<{ initialValue?: string; debounceMs?: number }>) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span>Description</span>
      <TextColumnFilter
        label="Description"
        value={value}
        onChange={setValue}
        placeholder="Search descriptions"
        debounceMs={debounceMs}
      />
      <span className="text-muted-foreground">Applied: {value || "none"}</span>
    </div>
  );
}

function CustomFilterExample() {
  const [selected, setSelected] = useState<string[]>(["Expense"]);

  function toggle(name: string, checked: boolean) {
    setSelected(checked ? [...selected, name] : selected.filter((item) => item !== name));
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span>Type</span>
      <ColumnFilter label="Type" active={selected.length > 0} onClear={() => setSelected([])}>
        {typeNames.map((name) => (
          <label key={name} className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selected.includes(name)}
              onCheckedChange={(checked) => toggle(name, checked)}
            />
            {name}
          </label>
        ))}
      </ColumnFilter>
      <span className="text-muted-foreground">Applied: {selected.join(", ") || "none"}</span>
    </div>
  );
}

const meta = {
  title: "UI/ColumnFilter",
  component: ColumnFilter,
} satisfies Meta<typeof ColumnFilter>;

export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <TextFilterExample /> };

export const Active: Story = { render: () => <TextFilterExample initialValue="Maxima" /> };

export const Debounced: Story = { render: () => <TextFilterExample debounceMs={600} /> };

export const CustomContent: Story = { render: () => <CustomFilterExample /> };
