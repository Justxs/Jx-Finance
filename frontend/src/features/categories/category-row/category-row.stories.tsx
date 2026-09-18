import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { categories, ids } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { CategoryRow } from "./category-row";

const personalCategory = categories.find((item) => item.id === ids.categories.food)!;
const sharedCategory = categories.find((item) => item.scope === "shared")!;
const noIconCategory = categories.find((item) => item.icon === null)!;

const meta = {
  title: "Features/Categories/CategoryRow",
  component: CategoryRow,
  args: {
    category: personalCategory,
    onDelete: fn(),
    onSaved: fn(),
    deletePending: false,
    deleteDisabled: false,
  },
  render: (args) => (
    <ul className="card w-[min(32rem,calc(100vw-3rem))] divide-y divide-border px-6">
      <QueryBoundary fallback={<Skeleton className="my-2.5 h-8 w-full" />}>
        <CategoryRow {...args} />
      </QueryBoundary>
    </ul>
  ),
} satisfies Meta<typeof CategoryRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Personal: Story = { args: { category: personalCategory } };

export const SharedLongName: Story = { args: { category: sharedCategory } };

export const NullIcon: Story = { args: { category: noIconCategory } };

export const UnknownIcon: Story = {
  args: { category: { ...personalCategory, icon: "not-a-real-icon" } },
};

export const SharedHouseholdMissing: Story = {
  args: { category: sharedCategory },
  parameters: { msw: { handlers: emptyHandlers } },
};

export const DeletePending: Story = { args: { deletePending: true, deleteDisabled: true } };

export const DeleteDisabled: Story = { args: { deleteDisabled: true } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const EditDialogOpen: Story = {
  args: { category: sharedCategory },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /^(edit|redaguoti)$/i }));
    await expect(await within(document.body).findByRole("dialog")).toBeVisible();
  },
};
