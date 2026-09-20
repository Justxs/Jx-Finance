import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SelectField } from "@/components/select-field/select-field";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { DatePicker } from "@/components/ui/date-picker/date-picker";
import {
  type DateRange,
  DateRangePicker,
} from "@/components/ui/date-range-picker/date-range-picker";
import { FieldError } from "@/components/ui/field-error";
import { FileInput } from "@/components/ui/file-input/file-input";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Input } from "@/components/ui/input/input";
import { Label } from "@/components/ui/label/label";

const meta = { title: "UI/Form controls" } satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const accountOptions = [
  { value: "", label: "No account" },
  { value: "checking", label: "Swedbank checking" },
  { value: "savings", label: "Savings with a deliberately long account name to test truncation" },
  { value: "cash", label: "Cash", disabled: true },
];

function FormExample() {
  const [account, setAccount] = useState("");
  const [date, setDate] = useState("2026-09-18");
  const [range, setRange] = useState<DateRange>({ from: "2026-09-01", to: "2026-09-18" });
  const [split, setSplit] = useState(false);

  return (
    <FormGrid className="w-[min(90vw,40rem)]">
      <div className="space-y-1.5">
        <Label htmlFor="story-amount">Amount</Label>
        <Input id="story-amount" inputMode="decimal" placeholder="0.00" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="story-invalid">Invalid amount</Label>
        <Input id="story-invalid" defaultValue="abc" aria-invalid />
        <FieldError message="Enter a positive amount." />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="story-account">Account</Label>
        <SelectField
          id="story-account"
          value={account}
          onChange={setAccount}
          options={accountOptions}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="story-date">Date</Label>
        <DatePicker id="story-date" value={date} onChange={setDate} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="story-range">Date range</Label>
        <DateRangePicker id="story-range" value={range} onChange={setRange} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={split} onCheckedChange={setSplit} />
        Split across categories
      </label>
      <div className="col-span-full">
        <FileInput id="story-file" placeholder="Choose a Swedbank CSV export" />
      </div>
    </FormGrid>
  );
}

export const AllControls: Story = { render: () => <FormExample /> };
