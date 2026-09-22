import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getCreateTagMockHandler, getUpdateTagMockHandler } from "@/api/generated/tags/tags.msw";
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
import { TagForm } from "./tag-form";

const personalTag = tags.find((item) => item.id === ids.tags.holiday)!;
const sharedTag = tags.find((item) => item.scope === "shared")!;

const meta = {
  title: "Features/Tags/TagForm",
  component: TagForm,
  args: { onDone: fn(), onCancel: fn() },
  render: (args) => (
    <div className="w-[min(32rem,calc(100vw-3rem))]">
      <QueryBoundary fallback={<Skeleton className="h-52 w-full" />}>
        <TagForm {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof TagForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Editing: Story = { args: { initial: personalTag } };

export const EditingShared: Story = { args: { initial: sharedTag } };

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
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
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

export const Renamed: Story = {
  args: { initial: personalTag },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByRole("textbox");
    await fireEvent.change(name, { target: { value: "Atostogos Ispanijoje" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));
    await waitFor(() => expect(args.onDone).toHaveBeenCalled());
  },
};

export const RenameDuplicate: Story = {
  args: { initial: personalTag },
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
