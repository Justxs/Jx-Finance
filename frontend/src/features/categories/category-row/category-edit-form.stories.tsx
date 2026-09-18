import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http } from "msw";
import { fireEvent, fn, userEvent, within } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { categories, ids } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { CategoryEditForm } from "./category-edit-form";

const personalCategory = categories.find((item) => item.id === ids.categories.food)!;
const sharedCategory = categories.find((item) => item.scope === "shared")!;
const noIconCategory = categories.find((item) => item.icon === null)!;
const incomeCategory = categories.find((item) => item.type === "income")!;

const meta = {
  title: "Features/Categories/CategoryEditForm",
  component: CategoryEditForm,
  args: { category: personalCategory, onSaved: fn(), onCancel: fn() },
  render: (args) => (
    <div className="w-[min(32rem,calc(100vw-3rem))]">
      <QueryBoundary fallback={<Skeleton className="h-72 w-full" />}>
        <CategoryEditForm {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof CategoryEditForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Personal: Story = { args: { category: personalCategory } };

export const SharedLongName: Story = { args: { category: sharedCategory } };

export const NoIcon: Story = { args: { category: noIconCategory } };

export const Income: Story = { args: { category: incomeCategory } };

export const SharedHouseholdMissing: Story = {
  args: { category: sharedCategory },
  parameters: { msw: { handlers: emptyHandlers } },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.clear(await canvas.findByRole("textbox"));
  },
};

export const SavePending: Story = {
  parameters: {
    msw: {
      handlers: [
        http.put("*/api/categories/:id", async () => {
          await delay("infinite");
        }),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.change(await canvas.findByRole("textbox"), {
      target: { value: "Maistas ir gėrimai" },
    });
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));
  },
};
