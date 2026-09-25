import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { PagedRows } from "./paged-rows";

const names = ["Everyday → Savings", "Savings → Everyday", "Everyday → Investments"];

const meta = {
  title: "Components/PagedRows",
  component: PagedRows,
  args: {
    paging: { page: 1, setPage: fn(), stale: false },
    pages: 3,
    count: names.length,
    emptyText: "No transfers yet.",
    children: names.map((name) => (
      <li key={name} className="py-2.5 text-sm">
        {name}
      </li>
    )),
  },
  decorators: [withWidth("panel")],
} satisfies Meta<typeof PagedRows>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LastPage: Story = { args: { paging: { page: 3, setPage: fn(), stale: false } } };

export const SinglePage: Story = { args: { pages: 1 } };

export const Stale: Story = { args: { paging: { page: 2, setPage: fn(), stale: true } } };

export const Empty: Story = { args: { count: 0, pages: 1, children: null } };
