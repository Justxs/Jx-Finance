import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { getDismissSuggestedRuleMockHandler } from "@/api/generated/categorization-rules/categorization-rules.msw";
import { accounts, categories, suggestedRules, tags } from "@/storybook/fixtures";
import { failWithStatus, pending, withHandlers } from "@/storybook/handlers";
import { readBody } from "@/storybook/handlers/http";
import { openedDialog } from "@/storybook/interactions";
import { SuggestedRules } from "./suggested-rules";

const dismissed = fn();

const meta = {
  title: "Features/CategorizationRules/SuggestedRules",
  component: SuggestedRules,
  args: { suggestions: suggestedRules, accounts, categories, tags },
} satisfies Meta<typeof SuggestedRules>;

export default meta;
type Story = StoryObj<typeof meta>;

const dismissButton = /^(dismiss|atmesti):/i;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(suggestedRules[0]!.name)).toBeInTheDocument();
    await expect(
      canvas.getByText(/based on 5 transactions|pagal 5 operacijas/i),
    ).toBeInTheDocument();
  },
};

export const Empty: Story = {
  args: { suggestions: [] },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/^(suggested rules|siūlomos taisyklės)$/i)).toBeNull();
  },
};

export const ReviewIsPrefilled: Story = {
  play: async ({ canvas }) => {
    const reviews = await canvas.findAllByRole("button", { name: /^(review|peržiūrėti)$/i });
    await userEvent.click(reviews[0]!);
    const dialog = await openedDialog();
    await expect(within(dialog).getByLabelText(/^(name|pavadinimas)$/i)).toHaveValue("LIDL");
    await expect(within(dialog).getByLabelText(/^(text|tekstas)$/i)).toHaveValue("LIDL");
  },
};

export const Dismiss: Story = {
  parameters: withHandlers(
    getDismissSuggestedRuleMockHandler(async ({ request }) => {
      dismissed(await readBody(request));
    }),
  ),
  play: async ({ canvas }) => {
    const buttons = await canvas.findAllByRole("button", { name: dismissButton });
    await userEvent.click(buttons[1]!);
    await waitFor(() =>
      expect(dismissed).toHaveBeenCalledWith({
        key: suggestedRules[1]!.key,
        categoryId: suggestedRules[1]!.categoryId,
      }),
    );
  },
};

export const DismissPending: Story = {
  parameters: withHandlers(getDismissSuggestedRuleMockHandler(pending)),
  play: async ({ canvas }) => {
    const buttons = await canvas.findAllByRole("button", { name: dismissButton });
    await userEvent.click(buttons[0]!);
    await expect(buttons[1]!).toBeDisabled();
  },
};

export const DismissFails: Story = {
  parameters: withHandlers(getDismissSuggestedRuleMockHandler(failWithStatus(500))),
  play: async ({ canvas }) => {
    const buttons = await canvas.findAllByRole("button", { name: dismissButton });
    await userEvent.click(buttons[0]!);
    await waitFor(() => expect(buttons[1]!).toBeEnabled());
    await expect(canvas.getAllByRole("button", { name: dismissButton })).toHaveLength(
      suggestedRules.length,
    );
  },
};
