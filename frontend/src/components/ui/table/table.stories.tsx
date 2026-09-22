import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Card } from "@/components/ui/card/card";
import { accounts } from "@/storybook/fixtures";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

const wideColumns = Array.from({ length: 12 }, (_, index) => `Month ${index + 1}`);

function AccountRows() {
  return (
    <>
      {accounts.map((account) => (
        <TableRow key={account.id}>
          <TableCell className="font-medium">{account.name}</TableCell>
          <TableCell>{account.type}</TableCell>
          <TableCell>{account.scope}</TableCell>
          <TableCell numeric>{account.currentBalance}</TableCell>
        </TableRow>
      ))}
    </>
  );
}

function AccountHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Account</TableHead>
        <TableHead>Type</TableHead>
        <TableHead>Scope</TableHead>
        <TableHead numeric>Balance</TableHead>
      </TableRow>
    </TableHeader>
  );
}

function SelectableExample() {
  const [selectedId, setSelectedId] = useState<string | null>(accounts[0]?.id ?? null);

  return (
    <Table>
      <AccountHeader />
      <TableBody>
        {accounts.map((account) => (
          <TableRow
            key={account.id}
            data-state={selectedId === account.id ? "selected" : undefined}
            onClick={() => setSelectedId(account.id)}
            className="cursor-pointer"
          >
            <TableCell className="font-medium">{account.name}</TableCell>
            <TableCell>{account.type}</TableCell>
            <TableCell>{account.scope}</TableCell>
            <TableCell numeric>{account.currentBalance}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const meta = {
  title: "UI/Table",
  component: Table,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <Card as="section" className="overflow-hidden">
        <Story />
      </Card>
    ),
  ],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Table>
      <AccountHeader />
      <TableBody>
        <AccountRows />
      </TableBody>
    </Table>
  ),
};

export const Empty: Story = {
  render: () => (
    <Table>
      <AccountHeader />
      <TableBody>
        <TableRow>
          <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
            No accounts yet.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const SelectedRow: Story = { render: () => <SelectableExample /> };

export const LongCellContent: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Description</TableHead>
          <TableHead numeric>Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="whitespace-normal">
            A very long description that wraps onto several lines instead of pushing the amount
            column off screen, because the cell opts out of the default nowrap behaviour
          </TableCell>
          <TableCell numeric>-129.99</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>
            A long description that keeps the default nowrap and scrolls sideways
          </TableCell>
          <TableCell numeric>2450.00</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};

export const WideScrolling: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Category</TableHead>
          {wideColumns.map((column) => (
            <TableHead key={column} numeric>
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {["Food", "Transport", "Household"].map((category, rowIndex) => (
          <TableRow key={category}>
            <TableCell className="font-medium">{category}</TableCell>
            {wideColumns.map((column, columnIndex) => (
              <TableCell key={column} numeric>
                {(rowIndex + 1) * 100 + columnIndex * 7}.00
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const WrappingNumericHeaders: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="align-bottom">Security</TableHead>
          <TableHead numeric wrap>
            Average cost per share
          </TableHead>
          <TableHead numeric wrap>
            Unrealized gain
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell className="font-medium">VWCE</TableCell>
          <TableCell numeric>98.40</TableCell>
          <TableCell numeric>+1,240.12</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
