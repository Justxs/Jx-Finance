import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ErrorState } from "@/components/error-state/error-state";
import { PageHeader } from "@/components/page-header/page-header";
import { Pagination } from "@/components/pagination/pagination";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { Button } from "@/components/ui/button/button";
import { Card } from "@/components/ui/card/card";
import { TextColumnFilter } from "@/components/ui/column-filter/column-filter";
import { ColumnHeader } from "@/components/ui/column-header/column-header";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";

const meta = {
  title: "Components/Data display",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  {
    id: "1",
    date: "18 Sept 2026",
    description: "Maxima groceries",
    category: "Food",
    amount: "-42.18",
  },
  { id: "2", date: "17 Sept 2026", description: "Salary", category: "Income", amount: "2450.00" },
  {
    id: "3",
    date: "15 Sept 2026",
    description:
      "A very long description that should wrap onto a second line instead of pushing the amount column off screen",
    category: "Household",
    amount: "-129.99",
  },
];

function TableExample() {
  const [sort, setSort] = useState("date");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  return (
    <Card as="section" className="overflow-hidden">
      <div className="overflow-x-auto" role="region" aria-label="Transactions" tabIndex={0}>
        <Table className="min-w-[40rem]">
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="h-auto px-6 py-3">
                <ColumnHeader
                  label="Date"
                  sortKey="date"
                  activeSort={sort}
                  direction="desc"
                  onSort={setSort}
                />
              </TableHead>
              <TableHead className="h-auto px-6 py-3">
                <ColumnHeader
                  label="Description"
                  sortKey="description"
                  activeSort={sort}
                  direction="asc"
                  onSort={setSort}
                  filter={
                    <TextColumnFilter label="Description" value={search} onChange={setSearch} />
                  }
                />
              </TableHead>
              <TableHead className="h-auto px-6 py-3">Category</TableHead>
              <TableHead className="h-auto px-6 py-3 text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="px-6 py-3">{row.date}</TableCell>
                <TableCell className="px-6 py-3 whitespace-normal">{row.description}</TableCell>
                <TableCell className="px-6 py-3">{row.category}</TableCell>
                <TableCell className="px-6 py-3 text-right tabular-nums">{row.amount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination page={page} pages={7} onPageChange={setPage} />
    </Card>
  );
}

export const Overview: Story = {
  render: () => (
    <div className="space-y-6">
      <PageHeader title="Transactions">
        <Button variant="outline">Export CSV</Button>
        <Button>Add transaction</Button>
      </PageHeader>
      <SummaryStats
        items={[
          { label: "Total balance", value: "12840.55" },
          { label: "Income this month", value: "2450", tone: "text-secondary" },
          { label: "Expenses this month", value: "1312.4", tone: "text-expense" },
          { label: "Loading value", value: undefined },
        ]}
      />
      <TableExample />
      <Skeleton className="h-24 w-full" />
      <Card as="section">
        <ErrorState onRetry={() => {}} />
      </Card>
    </div>
  ),
};
