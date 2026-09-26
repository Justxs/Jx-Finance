import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox } from "../checkbox/checkbox";
import { ColumnFilter, TextColumnFilter } from "./column-filter";

const typeNames = ["Income", "Expense", "Transfer"];

function TextFilterExample({ initialValue = "" }: Readonly<{ initialValue?: string }>) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span>Description</span>
      <TextColumnFilter
        label="Description"
        value={value}
        onChange={setValue}
        placeholder="Search descriptions"
      />
      <span className="text-muted-foreground">Applied: {value || "none"}</span>
    </div>
  );
}

function CustomFilterExample() {
  const [selected, setSelected] = useState<string[]>(["Expense"]);

  return (
    <div className="flex items-center gap-2 text-sm">
      <span>Type</span>
      <ColumnFilter<string[]> label="Type" value={selected} empty={[]} onApply={setSelected}>
        {(draft, setDraft) =>
          typeNames.map((name) => (
            <label key={name} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={draft.includes(name)}
                onCheckedChange={(checked) =>
                  setDraft(checked ? [...draft, name] : draft.filter((item) => item !== name))
                }
              />
              {name}
            </label>
          ))
        }
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

export const CustomContent: Story = { render: () => <CustomFilterExample /> };
