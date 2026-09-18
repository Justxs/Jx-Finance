import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Pagination } from "./pagination";

function PaginationExample({ pages }: Readonly<{ pages: number }>) {
  const [page, setPage] = useState(1);

  return <Pagination page={page} pages={pages} onPageChange={setPage} />;
}

const meta = {
  title: "Components/Pagination",
  component: Pagination,
  args: { page: 1, pages: 7, onPageChange: () => {} },
  decorators: [
    (Story) => (
      <section className="card w-[min(90vw,36rem)]">
        <Story />
      </section>
    ),
  ],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <PaginationExample pages={7} /> };

export const FirstPage: Story = { args: { page: 1 } };

export const MiddlePage: Story = { args: { page: 4 } };

export const LastPage: Story = { args: { page: 7 } };

export const SinglePage: Story = { args: { page: 1, pages: 1 } };

export const LargePageCount: Story = { args: { page: 1284, pages: 25000 } };
