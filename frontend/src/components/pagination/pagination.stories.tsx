import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, fn, userEvent } from "storybook/test";
import { Card } from "@/components/ui/card/card";
import { Pagination } from "./pagination";

function PaginationExample({ pages }: Readonly<{ pages: number }>) {
  const [page, setPage] = useState(1);

  return <Pagination page={page} pages={pages} onPageChange={setPage} />;
}

const meta = {
  title: "Components/Pagination",
  component: Pagination,
  args: { page: 1, pages: 7, onPageChange: fn() },
  decorators: [
    (Story) => (
      <Card as="section" className="w-[min(90vw,36rem)]">
        <Story />
      </Card>
    ),
  ],
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { render: () => <PaginationExample pages={7} /> };

export const FirstPage: Story = {
  args: { page: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Previous" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Next" })).toBeEnabled();
  },
};

export const MiddlePage: Story = {
  args: { page: 4 },
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole("textbox", { name: "Page" })).toHaveValue("4");

    await userEvent.click(canvas.getByRole("button", { name: "Previous" }));
    await userEvent.click(canvas.getByRole("button", { name: "Next" }));

    await expect(args.onPageChange).toHaveBeenNthCalledWith(1, 3);
    await expect(args.onPageChange).toHaveBeenNthCalledWith(2, 5);
  },
};

export const LastPage: Story = {
  args: { page: 7 },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Previous" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "Next" })).toBeDisabled();
  },
};

export const SinglePage: Story = {
  args: { page: 1, pages: 1 },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/^Page/u)).toBeNull();
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const LargePageCount: Story = { args: { page: 1284, pages: 25000 } };

export const WithRange: Story = {
  args: { page: 2, pages: 9, range: { total: 438, pageSize: 50 } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("51–100 of 438")).toBeVisible();
  },
};

export const GoToPage: Story = {
  args: { page: 2, pages: 9 },
  play: async ({ canvas, args }) => {
    const input = canvas.getByRole("textbox", { name: "Page" });
    await expect(input).toHaveValue("2");

    await userEvent.clear(input);
    await userEvent.type(input, "7{Enter}");

    await expect(args.onPageChange).toHaveBeenCalledWith(7);
  },
};

export const FewPagesHaveNoPageInput: Story = {
  args: { page: 2, pages: 3 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Page 2 of 3")).toBeVisible();
    await expect(canvas.queryByRole("textbox")).toBeNull();
  },
};
