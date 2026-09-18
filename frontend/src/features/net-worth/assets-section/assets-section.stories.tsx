import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { expect, userEvent, within } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { assets } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
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

const many = Array.from({ length: 15 }, (_, index) => ({
  ...assets[index % assets.length],
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
}));

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
      handlers: [http.get("*/api/assets", () => HttpResponse.json(many)), ...handlers],
    },
  },
};

export const AddDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /add asset|pridėti turtą/i }));
    await expect(await within(document.body).findByRole("dialog")).toBeVisible();
  },
};

export const DeletePending: Story = {
  parameters: {
    msw: {
      handlers: [
        http.delete("*/api/assets/:id", async () => {
          await delay("infinite");
        }),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", { name: /^(delete|ištrinti)$/i });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
