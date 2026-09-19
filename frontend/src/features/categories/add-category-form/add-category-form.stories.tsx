import type { Meta, StoryObj } from "@storybook/react-vite";
import { fireEvent, fn, userEvent, within } from "storybook/test";
import { getCreateCategoryMockHandler } from "@/api/generated/categories/categories.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  emptyHandlers,
  errorHandlers,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { AddCategoryForm } from "./add-category-form";

const meta = {
  title: "Features/Categories/AddCategoryForm",
  component: AddCategoryForm,
  args: { onCreated: fn(), onCancel: fn() },
  render: (args) => (
    <div className="w-[min(32rem,calc(100vw-3rem))]">
      <QueryBoundary fallback={<Skeleton className="h-72 w-full" />}>
        <AddCategoryForm {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof AddCategoryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoHouseholds: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const FilledWithIcon: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByRole("textbox"), "Pets and veterinary care");
    await userEvent.click(canvas.getByRole("button", { name: "coffee" }));
  },
};

export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByRole("textbox");
    await userEvent.type(name, "x");
    await userEvent.clear(name);
  },
};

export const SubmitPending: Story = {
  parameters: {
    msw: {
      handlers: [getCreateCategoryMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.change(await canvas.findByRole("textbox"), { target: { value: "Pets" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
  },
};
