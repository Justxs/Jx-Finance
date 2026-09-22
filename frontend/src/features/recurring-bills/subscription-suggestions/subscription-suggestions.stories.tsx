import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getDismissSubscriptionCandidateMockHandler } from "@/api/generated/recurring-bills/recurring-bills.msw";
import {
  accounts,
  categories,
  spotifyCandidate,
  subscriptionCandidates,
} from "@/storybook/fixtures";
import { failWithStatus, pending, withHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { SubscriptionSuggestions } from "./subscription-suggestions";

const meta = {
  title: "Features/RecurringBills/SubscriptionSuggestions",
  component: SubscriptionSuggestions,
  args: { candidates: subscriptionCandidates, accounts, categories },
} satisfies Meta<typeof SubscriptionSuggestions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { candidates: [] } };

export const OneCandidate: Story = { args: { candidates: [spotifyCandidate] } };

export const CreateDialogIsPrefilled: Story = {
  args: { candidates: [spotifyCandidate] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /create entry|sukurti įrašą/i }),
    );
    const dialog = await openedDialog();
    await expect(within(dialog).getByLabelText(/^(name|pavadinimas)$/i)).toHaveValue("Spotify ab");
    await expect(within(dialog).getByLabelText(/^(amount|suma)$/i)).toHaveValue("10.99");
  },
};

export const DismissPending: Story = {
  parameters: withHandlers(getDismissSubscriptionCandidateMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = await canvas.findAllByRole("button", { name: /^(dismiss|atmesti):/i });
    await userEvent.click(buttons[0]!);
    await expect(buttons[1]!).toBeDisabled();
  },
};

export const DismissFails: Story = {
  parameters: withHandlers(getDismissSubscriptionCandidateMockHandler(failWithStatus(500))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = await canvas.findAllByRole("button", { name: /^(dismiss|atmesti):/i });
    await userEvent.click(buttons[0]!);
    await expect(
      await canvas.findAllByRole("button", { name: /^(dismiss|atmesti):/i }),
    ).toHaveLength(subscriptionCandidates.length);
  },
};
