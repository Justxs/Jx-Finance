import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent } from "storybook/test";
import { getImportPreviewMockHandler } from "@/api/generated/imports/imports.msw";
import { withPageFrame } from "@/storybook/decorators";
import {
  accounts,
  checkingAccount,
  ids,
  importFormatProblem,
  importPreviewAllDuplicates,
} from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { uploadAndPreview } from "@/storybook/import-play";
import { ImportSection } from "./import-section";

const meta = {
  title: "Features/Imports/ImportSection",
  component: ImportSection,
  parameters: { layout: "fullscreen" },
  args: { accounts },
  decorators: [withPageFrame],
} satisfies Meta<typeof ImportSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleAccount: Story = { args: { accounts: [checkingAccount] } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Previewed: Story = {
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const PreviewedEmptyFile: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const PreviewPending: Story = {
  parameters: withHandlers(getImportPreviewMockHandler(pending)),
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const PreselectedAccount: Story = { args: { initialAccountId: ids.accounts.savings } };

export const FormatError: Story = {
  parameters: withHandlers(getImportPreviewMockHandler(failWith(importFormatProblem))),
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const EmptyFileChosen: Story = {
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement, "");
  },
};

export const NoFileChosen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /^(preview|peržiūra)$/i }));
  },
};

export const AllDuplicates: Story = {
  parameters: withHandlers(getImportPreviewMockHandler(importPreviewAllDuplicates)),
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const Confirmed: Story = {
  play: async ({ canvas, canvasElement }) => {
    await uploadAndPreview(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /^(import \d+ rows?|importuoti \d+ eilu)/i }),
    );
  },
};
