import type { Meta, StoryObj } from "@storybook/react-vite";
import { ScanText } from "lucide-react";
import { useState } from "react";
import { expect, fireEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { FileInput } from "./file-input";

function FileInputExample() {
  const [size, setSize] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <FileInput
        id="file-input-story-controlled"
        placeholder="Choose a Swedbank CSV export"
        accept=".csv"
        onChange={(event) => setSize(event.target.files?.[0]?.size ?? null)}
      />
      <p className="text-xs text-muted-foreground">
        {size === null ? "No file chosen yet." : `Selected file size: ${size} bytes.`}
      </p>
    </div>
  );
}

const meta = {
  title: "UI/FileInput",
  component: FileInput,
  args: { id: "file-input-story", placeholder: "Choose a Swedbank CSV export" },
  decorators: [withWidth("column")],
} satisfies Meta<typeof FileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CsvOnly: Story = { args: { accept: ".csv" } };

export const LongPlaceholder: Story = {
  args: {
    placeholder:
      "Choose the CSV statement exported from your Swedbank internet bank for the period you want to import",
  },
};

export const Compact: Story = { args: { className: "min-h-16" } };

export const ButtonVariant: Story = {
  args: { variant: "button", icon: ScanText, placeholder: "Fill from receipt" },
};

export const DisabledButton: Story = {
  args: { variant: "button", icon: ScanText, placeholder: "Fill from receipt", disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Fill from receipt")).toBeDisabled();
  },
};

export const DraggingOver: Story = {
  args: { dropPlaceholder: "Drop to attach" },
  play: async ({ canvas }) => {
    await fireEvent.dragEnter(canvas.getByLabelText("Choose a Swedbank CSV export"));
    await expect(canvas.getByText("Drop to attach")).toBeVisible();
  },
};

export const NarrowContainer: Story = {
  decorators: [withWidth("w-40")],
};

export const ReportsSelectedFile: Story = { render: () => <FileInputExample /> };
