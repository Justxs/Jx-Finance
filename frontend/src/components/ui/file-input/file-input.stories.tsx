import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
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
  decorators: [
    (Story) => (
      <div className="w-[min(90vw,28rem)]">
        <Story />
      </div>
    ),
  ],
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

export const Compact: Story = { args: { className: "h-16" } };

export const NarrowContainer: Story = {
  decorators: [
    (Story) => (
      <div className="w-40">
        <Story />
      </div>
    ),
  ],
};

export const ReportsSelectedFile: Story = { render: () => <FileInputExample /> };
