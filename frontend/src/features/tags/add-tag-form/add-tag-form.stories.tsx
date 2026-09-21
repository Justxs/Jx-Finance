import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getCreateTagMockHandler } from "@/api/generated/tags/tags.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { duplicateTagProblem } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { AddTagForm } from "./add-tag-form";

const meta = {
  title: "Features/Tags/AddTagForm",
  component: AddTagForm,
  args: { onCreated: fn(), onCancel: fn() },
  render: (args) => (
    <div className="w-[min(32rem,calc(100vw-3rem))]">
      <QueryBoundary fallback={<Skeleton className="h-52 w-full" />}>
        <AddTagForm {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof AddTagForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoHouseholds: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByRole("textbox");
    await userEvent.type(name, "x");
    await userEvent.clear(name);
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
  },
};

export const DuplicateName: Story = {
  parameters: {
    msw: { handlers: [getCreateTagMockHandler(failWith(duplicateTagProblem, 409)), ...handlers] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(await canvas.findByRole("textbox"), { target: { value: "Atostogos" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
    const alert = await canvas.findByRole("alert");
    await expect(alert).toBeInTheDocument();
  },
};

export const SubmitPending: Story = {
  parameters: { msw: { handlers: [getCreateTagMockHandler(pending), ...handlers] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(await canvas.findByRole("textbox"), { target: { value: "Remontas" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
  },
};
