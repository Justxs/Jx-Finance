import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { ids, tags } from "@/storybook/fixtures";
import { TagChips, tagMapOf } from "./tag-chips";

const tagById = tagMapOf(tags);

const meta = {
  title: "Features/Tags/TagChips",
  component: TagChips,
  args: { tagIds: [ids.tags.holiday, ids.tags.car], tagById },
  decorators: [withWidth("card")],
} satisfies Meta<typeof TagChips>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const One: Story = { args: { tagIds: [ids.tags.reimbursable] } };

export const Overflowing: Story = {
  args: { tagIds: tags.map((tag) => tag.id) },
};

export const UnknownTag: Story = {
  args: { tagIds: [ids.tags.holiday, "00000000-0000-4000-8000-000000000999"] },
};

export const None: Story = { args: { tagIds: [] } };
