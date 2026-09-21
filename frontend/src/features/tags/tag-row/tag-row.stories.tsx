import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Rows } from "@/components/ui/rows/rows";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { ids, tags } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { TagRow } from "./tag-row";

const personalTag = tags.find((item) => item.id === ids.tags.holiday)!;
const sharedTag = tags.find((item) => item.scope === "shared")!;

const meta = {
  title: "Features/Tags/TagRow",
  component: TagRow,
  args: {
    tag: personalTag,
    onDelete: fn(),
    deletePending: false,
    deleteDisabled: false,
  },
  render: (args) => (
    <div className="w-[min(32rem,calc(100vw-3rem))]">
      <QueryBoundary fallback={<Skeleton className="my-2.5 h-8 w-full" />}>
        <Rows>
          <TagRow {...args} />
        </Rows>
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof TagRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Shared: Story = { args: { tag: sharedTag } };

export const LongName: Story = {
  args: {
    tag: {
      ...personalTag,
      name: "Namų ūkio prekės, remontas ir sodo priežiūra šį sezoną",
    },
  },
};

export const SharedHouseholdMissing: Story = {
  args: { tag: sharedTag },
  parameters: { msw: { handlers: emptyHandlers } },
};

export const DeletePending: Story = { args: { deletePending: true, deleteDisabled: true } };

export const DeleteDisabled: Story = { args: { deleteDisabled: true } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const EditDialogOpen: Story = {
  args: { tag: sharedTag },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /^(edit|redaguoti)(:|$)/i }));
    await openedDialog();
  },
};
