import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, delay, http } from "msw";
import { expect, userEvent, within } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary";
import { RoutePending } from "@/components/route-pending";
import { completedGoal, goals, openEndedGoal } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { GoalsPage } from "./goals-page";

function GoalsPageStory() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <QueryBoundary fallback={<RoutePending />}>
        <GoalsPage />
      </QueryBoundary>
    </div>
  );
}

const manyGoals = Array.from({ length: 12 }, (_, index) => ({
  ...goals[index % goals.length],
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
}));

const meta = {
  title: "Features/Goals/GoalsPage",
  component: GoalsPage,
  parameters: { layout: "fullscreen", route: "/goals" },
  render: () => <GoalsPageStory />,
} satisfies Meta<typeof GoalsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const SingleCompletedGoal: Story = {
  parameters: {
    msw: {
      handlers: [http.get("*/api/goals", () => HttpResponse.json([completedGoal])), ...handlers],
    },
  },
};

export const LongList: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/goals", () => HttpResponse.json([openEndedGoal, ...manyGoals])),
        ...handlers,
      ],
    },
  },
};

export const AddDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /add goal|pridėti tikslą/i }));
    await expect(await within(document.body).findByRole("dialog")).toBeVisible();
  },
};

export const DeletePending: Story = {
  parameters: {
    msw: {
      handlers: [
        http.delete("*/api/goals/:id", async () => {
          await delay("infinite");
        }),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", { name: /^(delete|ištrinti)$/i });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
