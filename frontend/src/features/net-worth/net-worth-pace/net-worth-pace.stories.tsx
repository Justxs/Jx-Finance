import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { getNetWorthHistoryMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { Section } from "@/components/ui/section/section";
import { readPreferences, savePreferences } from "@/stores/preferences";
import { withWidth } from "@/storybook/decorators";
import { netWorthHistoryItems } from "@/storybook/fixtures";
import { errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { NetWorthPace } from "./net-worth-pace";

const fallingItems = netWorthHistoryItems.map((item, index) => ({
  ...item,
  netWorth: String(90_000 - index * 1500),
}));

function milestonesStored(milestones: number[] | undefined) {
  return () => {
    savePreferences({ paceMilestones: milestones });
    return () => savePreferences({ paceMilestones: undefined });
  };
}

const meta = {
  title: "Features/NetWorth/NetWorthPace",
  component: NetWorthPace,
  parameters: { route: "/net-worth" },
  beforeEach: milestonesStored(undefined),
  decorators: [
    (Story) => (
      <Section>
        <Story />
      </Section>
    ),
    withWidth("panel"),
  ],
} satisfies Meta<typeof NetWorthPace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rising: Story = {
  play: async ({ canvas }) => {
    await canvas.findByText(/a month on average since Oct 1, 2025/);
    const list = await canvas.findByRole("list", { name: "Milestones" });
    await expect(list).toHaveTextContent("€100,000.00");
    await expect(list).toHaveTextContent("€200,000.00");
    await expect(list).toHaveTextContent(/Around \w+ \d{4}/);
  },
};

export const Falling: Story = {
  beforeEach: milestonesStored([50_000, 100_000]),
  parameters: withHandlers(getNetWorthHistoryMockHandler({ items: fallingItems })),
  play: async ({ canvas }) => {
    await canvas.findByText("−€1,499.16");
    const list = await canvas.findByRole("list", { name: "Milestones" });
    await expect(list).toHaveTextContent("Already reached");
    await expect(list).toHaveTextContent("Not reached at this pace");
  },
};

export const ShortHistory: Story = {
  parameters: withHandlers(
    getNetWorthHistoryMockHandler({ items: netWorthHistoryItems.slice(-3) }),
  ),
  play: async ({ canvas }) => {
    await canvas.findByText("The pace shows once there are three months of snapshots.");
  },
};

export const NoMilestones: Story = {
  beforeEach: milestonesStored([]),
  play: async ({ canvas }) => {
    await canvas.findByText("No milestones. Add an amount to see when this pace would reach it.");
  },
};

export const HiddenAmounts: Story = {
  globals: { amounts: "hidden" },
  play: async ({ canvas }) => {
    const list = await canvas.findByRole("list", { name: "Milestones" });
    await expect(list).not.toHaveTextContent("100,000");
    await expect(list).toHaveTextContent("•");
  },
};

export const AddMilestone: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText("Milestone amount"), "150000");
    await userEvent.click(canvas.getByRole("button", { name: "Add milestone" }));

    await waitFor(() =>
      expect(readPreferences().paceMilestones).toEqual([100_000, 150_000, 200_000]),
    );
    await expect(canvas.getByRole("list", { name: "Milestones" })).toHaveTextContent("€150,000.00");
    await expect(canvas.getByLabelText("Milestone amount")).toHaveValue("");
  },
};

export const RemoveMilestone: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: "Remove milestone €100,000.00" }),
    );

    await waitFor(() => expect(readPreferences().paceMilestones).toEqual([200_000]));
  },
};

export const FullList: Story = {
  beforeEach: milestonesStored([100_000, 150_000, 200_000, 250_000, 300_000]),
  play: async ({ canvas }) => {
    await canvas.findByRole("list", { name: "Milestones" });
    await expect(canvas.queryByLabelText("Milestone amount")).toBeNull();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
