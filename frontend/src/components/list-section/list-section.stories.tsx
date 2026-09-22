import type { Meta, StoryObj } from "@storybook/react-vite";
import { ListSection } from "./list-section";

const meta = {
  title: "Components/ListSection",
  component: ListSection,
  args: {
    title: "Tags",
    count: 3,
    emptyText: "No tags yet.",
    children: ["Holiday", "Kids", "Repairs"].map((name) => (
      <li key={name} className="py-2 text-sm">
        {name}
      </li>
    )),
  },
  render: (args) => (
    <div className="w-[min(32rem,calc(100vw-3rem))]">
      <ListSection {...args} />
    </div>
  ),
} satisfies Meta<typeof ListSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: { description: "Tags cut across categories, so one purchase can carry several." },
};

export const Empty: Story = { args: { count: 0, children: null } };
