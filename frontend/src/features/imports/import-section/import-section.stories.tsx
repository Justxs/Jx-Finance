import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { accounts, checkingAccount, ids } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  importAllDuplicatesHandlers,
  importFormatErrorHandlers,
  importPendingHandlers,
  loadingHandlers,
} from "@/storybook/handlers";
import { uploadAndPreview } from "@/storybook/import-play";
import { ImportSection } from "./import-section";

const meta = {
  title: "Features/Imports/ImportSection",
  component: ImportSection,
  parameters: { layout: "fullscreen" },
  args: { accounts },
  render: (args) => (
    <div className="p-6 lg:p-10">
      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <ImportSection {...args} />
      </QueryBoundary>
    </div>
  ),
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
  parameters: { msw: { handlers: importPendingHandlers } },
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const PreselectedAccount: Story = { args: { initialAccountId: ids.accounts.savings } };

export const FormatError: Story = {
  parameters: { msw: { handlers: importFormatErrorHandlers } },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /^(preview|peržiūra)$/i }));
  },
};

export const AllDuplicates: Story = {
  parameters: { msw: { handlers: importAllDuplicatesHandlers } },
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const Confirmed: Story = {
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /^(import \d+ rows?|importuoti \d+ eilu)/i }),
    );
  },
};
