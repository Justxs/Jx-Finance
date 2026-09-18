import type { Meta, StoryObj } from "@storybook/react-vite";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { ids } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  importAllDuplicatesHandlers,
  importFormatErrorHandlers,
  loadingHandlers,
} from "@/storybook/handlers";
import { uploadAndPreview } from "@/storybook/import-play";
import { ImportPage } from "./import-page";

const meta = {
  title: "Features/Imports/ImportPage",
  component: ImportPage,
  parameters: { layout: "fullscreen", route: "/import" },
  render: () => (
    <div className="mx-auto max-w-6xl p-6">
      <QueryBoundary fallback={<Skeleton className="h-96 w-full" />}>
        <ImportPage />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof ImportPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PreselectedAccount: Story = {
  parameters: { route: `/import?accountId=${ids.accounts.shared}` },
};

export const Review: Story = {
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const NoAccounts: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const FormatError: Story = {
  parameters: { msw: { handlers: importFormatErrorHandlers } },
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const AllDuplicates: Story = {
  parameters: { msw: { handlers: importAllDuplicatesHandlers } },
  play: async ({ canvasElement }) => {
    await uploadAndPreview(canvasElement);
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
