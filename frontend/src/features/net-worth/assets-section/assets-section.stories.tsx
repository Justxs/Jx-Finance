import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import {
  getDeleteAssetMockHandler,
  getAssetsMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { assets, many } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { AssetsSection } from "./assets-section";

function AssetsSectionStory() {
  return (
    <div className="w-[min(48rem,calc(100vw-3rem))]">
      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <AssetsSection />
      </QueryBoundary>
    </div>
  );
}

const manyItems = many(assets, 15);

const meta = {
  title: "Features/NetWorth/AssetsSection",
  component: AssetsSection,
  parameters: { route: "/net-worth" },
  render: () => <AssetsSectionStory />,
} satisfies Meta<typeof AssetsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const LongList: Story = {
  parameters: {
    msw: {
      handlers: [getAssetsMockHandler(manyItems), ...handlers],
    },
  },
};

export const AddDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /add asset|pridėti turtą/i }));
    await openedDialog();
  },
};

export const DeletePending: Story = {
  parameters: {
    msw: {
      handlers: [getDeleteAssetMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti)(:|$)/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
