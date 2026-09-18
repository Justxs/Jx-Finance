import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { TextColumnFilter } from "../column-filter";
import { ColumnHeader, type SortDirection } from "./column-header";

function SortableExample({ withFilter }: Readonly<{ withFilter?: boolean }>) {
  const [sort, setSort] = useState<string | undefined>(undefined);
  const [direction, setDirection] = useState<SortDirection>("asc");
  const [search, setSearch] = useState("");

  function handleSort(key: string) {
    setDirection(sort === key && direction === "asc" ? "desc" : "asc");
    setSort(key);
  }

  return (
    <div className="flex gap-8 text-sm font-medium text-muted-foreground">
      <ColumnHeader
        label="Date"
        sortKey="date"
        activeSort={sort}
        direction={direction}
        onSort={handleSort}
      />
      <ColumnHeader
        label="Description"
        sortKey="description"
        activeSort={sort}
        direction={direction}
        onSort={handleSort}
        filter={
          withFilter ? (
            <TextColumnFilter label="Description" value={search} onChange={setSearch} />
          ) : undefined
        }
      />
    </div>
  );
}

const meta = {
  title: "UI/ColumnHeader",
  component: ColumnHeader,
  args: { label: "Amount", sortKey: "amount", onSort: () => undefined },
  decorators: [
    (Story) => (
      <div className="text-sm font-medium text-muted-foreground">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ColumnHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SortedAscending: Story = { args: { activeSort: "amount", direction: "asc" } };

export const SortedDescending: Story = { args: { activeSort: "amount", direction: "desc" } };

export const NotSortable: Story = { args: { sortKey: undefined, onSort: undefined } };

export const WithFilter: Story = {
  args: {
    filter: <TextColumnFilter label="Amount" value="" onChange={() => undefined} />,
  },
};

export const WithActiveFilter: Story = {
  args: {
    activeSort: "amount",
    direction: "desc",
    filter: <TextColumnFilter label="Amount" value="42" onChange={() => undefined} />,
  },
};

export const LongLabel: Story = {
  args: { label: "Remaining budget after planned recurring bills" },
};

export const InteractiveSorting: Story = { render: () => <SortableExample /> };

export const InteractiveSortingWithFilter: Story = {
  render: () => <SortableExample withFilter />,
};
