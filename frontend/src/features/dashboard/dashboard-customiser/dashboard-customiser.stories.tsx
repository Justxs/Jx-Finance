import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  getResetDashboardLayoutMockHandler,
  getSaveDashboardLayoutMockHandler,
} from "@/api/generated/dashboard/dashboard.msw";
import { withWidth } from "@/storybook/decorators";
import {
  customDashboardLayout,
  defaultDashboardLayout,
  hiddenCardsDashboardLayout,
  serverErrorProblem,
  settings,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { DashboardCustomiser } from "./dashboard-customiser";

const meta = {
  title: "Features/Dashboard/DashboardCustomiser",
  component: DashboardCustomiser,
  decorators: [withWidth("wide")],
  args: {
    layout: defaultDashboardLayout,
    features: settings.features,
    onDone: fn(),
  },
} satisfies Meta<typeof DashboardCustomiser>;

export default meta;
type Story = StoryObj<typeof meta>;

const cardList = /^(dashboard cards|suvestinės kortelės)$/i;

function listedTitles(canvasElement: HTMLElement) {
  const list = within(canvasElement).getByRole("list", { name: cardList });
  return within(list)
    .getAllByRole("checkbox")
    .map((box) => box.closest("label")?.textContent ?? "");
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("checkbox")).toHaveLength(9);
    await expect(canvas.queryAllByRole("checkbox", { checked: false })).toHaveLength(0);
    await expect(
      canvas.getByRole("button", { name: /^(move up|pakelti): (total balance|bendras likutis)$/i }),
    ).toBeDisabled();
  },
};

export const CustomOrder: Story = {
  args: { layout: customDashboardLayout },
  play: async ({ canvasElement }) => {
    await expect(listedTitles(canvasElement)[0]).toMatch(
      /balance by account|likutis pagal sąskaitą/i,
    );
  },
};

export const HiddenCards: Story = {
  args: { layout: hiddenCardsDashboardLayout },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole("checkbox", { name: /income vs\. expenses|pajamos ir išlaidos/i }),
    ).not.toBeChecked();
    await expect(
      canvas.getByRole("checkbox", { name: /total balance|bendras likutis/i }),
    ).toBeChecked();
  },
};

export const FeatureSwitchedOff: Story = {
  args: {
    features: { ...settings.features, budgets: false, netWorth: false, reports: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getAllByRole("checkbox")).toHaveLength(6);
    await expect(canvas.getByText(/switched off|išjungė/i)).toBeInTheDocument();
  },
};

export const KeyboardReorder: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const down = canvas.getByRole("button", {
      name: /^(move down|nuleisti): (total balance|bendras likutis)$/i,
    });
    down.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");

    await expect(down).toHaveFocus();
    await expect(listedTitles(canvasElement)[2]).toMatch(/total balance|bendras likutis/i);
    await expect(canvas.getByRole("status")).toHaveTextContent(/3/);
  },
};

export const SaveSendsTheDraft: Story = {
  args: { onDone: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("checkbox", { name: /total balance|bendras likutis/i }));
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));

    await waitFor(() => expect(args.onDone).toHaveBeenCalled());
  },
};

export const Cancel: Story = {
  args: { onDone: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^(cancel|atšaukti)$/i }));
    await expect(args.onDone).toHaveBeenCalled();
  },
};

export const ResetToDefault: Story = {
  args: { layout: customDashboardLayout, onDone: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /reset to default|atkurti numatytąjį/i }),
    );
    await waitFor(() => expect(args.onDone).toHaveBeenCalled());
  },
};

export const Saving: Story = {
  parameters: withHandlers(getSaveDashboardLayoutMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /^(cancel|atšaukti)$/i })).toBeDisabled(),
    );
  },
};

export const SaveError: Story = {
  parameters: withHandlers(
    getSaveDashboardLayoutMockHandler(failWith(serverErrorProblem, 500)),
    getResetDashboardLayoutMockHandler(failWith(serverErrorProblem, 500)),
  ),
  args: { onDone: fn() },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));

    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
    await expect(args.onDone).not.toHaveBeenCalled();
  },
};
