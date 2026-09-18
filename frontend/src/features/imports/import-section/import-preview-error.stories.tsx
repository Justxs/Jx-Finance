import type { Meta, StoryObj } from "@storybook/react-vite";
import { importFormatProblem, serverErrorProblem } from "@/storybook/fixtures";
import { ImportPreviewError } from "./import-preview-error";

const meta = {
  title: "Features/Imports/ImportPreviewError",
  component: ImportPreviewError,
  args: { error: importFormatProblem },
  render: (args) => (
    <div className="w-[min(40rem,90vw)]">
      <ImportPreviewError {...args} />
    </div>
  ),
} satisfies Meta<typeof ImportPreviewError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WrongFormat: Story = {};

export const FileRejected: Story = {
  args: {
    error: {
      status: 400,
      errors: [{ name: "file", reason: "Choose a non-empty CSV file no larger than 5 MB." }],
    },
  },
};

export const ServerError: Story = { args: { error: serverErrorProblem } };
