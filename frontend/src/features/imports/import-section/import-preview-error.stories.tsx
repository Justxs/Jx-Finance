import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { ApiError } from "@/api/client";
import { withWidth } from "@/storybook/decorators";
import { importFormatProblem, serverErrorProblem } from "@/storybook/fixtures";
import { ImportPreviewError } from "./import-preview-error";

const meta = {
  title: "Features/Imports/ImportPreviewError",
  component: ImportPreviewError,
  args: {
    error: new ApiError({ status: 400, detail: importFormatProblem.detail }),
    format: "swedbankCsv",
  },
  decorators: [withWidth("panel")],
} satisfies Meta<typeof ImportPreviewError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WrongFormat: Story = {};

export const WrongXmlFormat: Story = { args: { format: "camt053" } };

export const NoStatementForAccount: Story = {
  args: {
    format: "camt053",
    error: new ApiError({
      status: 400,
      errors: [
        {
          name: "generalErrors",
          reason: "LT647044001231465456, LT307044060001234567",
          code: "import.noStatementForAccount",
        },
      ],
    }),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "LT647044001231465456, LT307044060001234567",
    );
  },
};

export const FileRejected: Story = {
  args: {
    error: new ApiError({
      status: 400,
      errors: [
        {
          name: "file",
          reason:
            "Choose a non-empty file, at most 5 MB for a CSV statement or 20 MB for an XML statement.",
        },
      ],
    }),
  },
};

export const ServerError: Story = {
  args: { error: new ApiError({ status: 500, title: serverErrorProblem.title }) },
};
