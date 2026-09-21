import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getUpdateTagMockHandler } from "@/api/generated/tags/tags.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { duplicateTagProblem, ids, tags } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { TagEditForm } from "./tag-edit-form";

const personalTag = tags.find((item) => item.id === ids.tags.holiday)!;
const sharedTag = tags.find((item) => item.scope === "shared")!;

const meta = {
  title: "Features/Tags/TagEditForm",
  component: TagEditForm,
  args: { tag: personalTag, onSaved: fn(), onCancel: fn() },
  render: (args) => (
    <div className="w-[min(32rem,calc(100vw-3rem))]">
      <QueryBoundary fallback={<Skeleton className="h-32 w-full" />}>
        <TagEditForm {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof TagEditForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Shared: Story = { args: { tag: sharedTag } };

export const NoHouseholds: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Renamed: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByRole("textbox");
    await fireEvent.change(name, { target: { value: "Atostogos Ispanijoje" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));
    await waitFor(() => expect(args.onSaved).toHaveBeenCalled());
  },
};

export const DuplicateName: Story = {
  parameters: {
    msw: { handlers: [getUpdateTagMockHandler(failWith(duplicateTagProblem, 409)), ...handlers] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(await canvas.findByRole("textbox"), { target: { value: "Vaikams" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
  },
};

export const SavePending: Story = {
  parameters: { msw: { handlers: [getUpdateTagMockHandler(pending), ...handlers] } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(await canvas.findByRole("textbox"), { target: { value: "Kelionė" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));
  },
};
