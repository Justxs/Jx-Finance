import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../button";
import { Input } from "../input";
import { Label } from "../label";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

const sides = ["top", "right", "bottom", "left"] as const;

function ControlledExample() {
  const [open, setOpen] = useState(false);
  const [limit, setLimit] = useState("250");

  return (
    <div className="flex items-center gap-3 text-sm">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" />}>Edit limit</PopoverTrigger>
        <PopoverContent align="start">
          <div className="space-y-1.5">
            <Label htmlFor="popover-story-limit">Monthly limit</Label>
            <Input
              id="popover-story-limit"
              inputMode="decimal"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground">Limit: {limit}</span>
    </div>
  );
}

const meta = {
  title: "UI/Popover",
  component: Popover,
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger render={<Button variant="outline" />}>About budgets</PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Budgets</PopoverTitle>
          <PopoverDescription>
            A budget limits monthly spending in a single category.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

export const Closed: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Open popover</PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Closed by default</PopoverTitle>
          <PopoverDescription>Click outside or press Escape to dismiss.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

export const WithForm: Story = { render: () => <ControlledExample /> };

export const Sides: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-3 p-24">
      {sides.map((side) => (
        <Popover key={side}>
          <PopoverTrigger render={<Button variant="outline" />}>{side}</PopoverTrigger>
          <PopoverContent side={side} className="w-40">
            Opens on the {side}.
          </PopoverContent>
        </Popover>
      ))}
    </div>
  ),
};

export const LongContent: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger render={<Button variant="outline" />}>Import rules</PopoverTrigger>
      <PopoverContent align="start">
        <PopoverHeader>
          <PopoverTitle>
            How imported Swedbank statement rows are matched to existing transactions
          </PopoverTitle>
          <PopoverDescription>
            Rows are matched by date, amount and description. Rows that already exist are marked as
            duplicates and skipped unless you tick them again. Categories are suggested from earlier
            transactions with the same counterparty, and you can change every suggestion before the
            import is confirmed.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};
