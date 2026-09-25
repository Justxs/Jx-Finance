import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import {
  getCreateCategoryMockHandler,
  getUpdateCategoryMockHandler,
} from "@/api/generated/categories/categories.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { categories, ids } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { CategoryForm } from "./category-form";

const personalCategory = categories.find((item) => item.id === ids.categories.food)!;
const sharedCategory = categories.find((item) => item.scope === "shared")!;
const noIconCategory = categories.find((item) => item.icon === null)!;
const incomeCategory = categories.find((item) => item.type === "income")!;

const meta = {
  title: "Features/Categories/CategoryForm",
  component: CategoryForm,
  args: { onClose: fn() },
  render: (args) => (
    <div className="w-[min(32rem,calc(100vw-3rem))]">
      <QueryBoundary fallback={<Skeleton className="h-72 w-full" />}>
        <CategoryForm {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof CategoryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Editing: Story = { args: { initial: personalCategory } };

export const EditingShared: Story = { args: { initial: sharedCategory } };

export const EditingWithoutIcon: Story = { args: { initial: noIconCategory } };

export const EditingIncome: Story = { args: { initial: incomeCategory } };

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
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
  },
};

export const SubmitPending: Story = {
  parameters: withHandlers(getCreateCategoryMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(await canvas.findByRole("textbox"), { target: { value: "Pets" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
  },
};

export const EditHidesType: Story = {
  args: { initial: personalCategory },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("textbox");
    await expect(canvasElement.querySelector("#category-type")).toBeNull();
  },
};

export const SavePending: Story = {
  args: { initial: personalCategory },
  parameters: withHandlers(getUpdateCategoryMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(await canvas.findByRole("textbox"), { target: { value: "Maistas" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));
  },
};
