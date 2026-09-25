import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  getPreviewCategorizationRunMockHandler,
  getRunCategorizationRulesMockHandler,
} from "@/api/generated/categorization-rules/categorization-rules.msw";
import { accounts, rulesRunNothing } from "@/storybook/fixtures";
import { failWithStatus, pending, withHandlers } from "@/storybook/handlers";
import { RunRulesDialog } from "./run-rules-dialog";

const meta = {
  title: "Features/CategorizationRules/RunRulesDialog",
  component: RunRulesDialog,
  args: { accounts, hasRules: true, onClose: fn() },
  render: (args) => (
    <div className="w-[min(40rem,calc(100vw-3rem))]">
      <RunRulesDialog {...args} />
    </div>
  ),
} satisfies Meta<typeof RunRulesDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutRules: Story = { args: { hasRules: false } };

export const PreviewShowsWhatEachRuleWouldTouch: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /^(preview|peržiūrėti)$/i }));
    await expect(
      await canvas.findByText(/27 transactions in total|iš viso 27/i),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: /apply to|pritaikyti/i })).toBeEnabled();
  },
};

export const PreviewFindsNothing: Story = {
  parameters: withHandlers(getPreviewCategorizationRunMockHandler(rulesRunNothing)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /^(preview|peržiūrėti)$/i }));
    await expect(
      await canvas.findByText(/no transaction matches|nė viena operacija nesutampa/i),
    ).toBeInTheDocument();
  },
};

export const PreviewPending: Story = {
  parameters: withHandlers(getPreviewCategorizationRunMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /^(preview|peržiūrėti)$/i }));
  },
};

export const RecategorizeChangesThePreview: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByRole("checkbox", {
      name: /also replace categories|taip pat pakeisti/i,
    });
    await userEvent.click(await canvas.findByRole("button", { name: /^(preview|peržiūrėti)$/i }));
    await expect(
      await canvas.findByText(/27 transactions in total|iš viso 27/i),
    ).toBeInTheDocument();
    await userEvent.click(toggle);
    await expect(canvas.queryByText(/in total|iš viso/i)).toBeNull();
  },
};

export const ApplyRuns: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /^(preview|peržiūrėti)$/i }));
    await userEvent.click(await canvas.findByRole("button", { name: /apply to|pritaikyti/i }));
  },
};

export const ApplyFails: Story = {
  parameters: withHandlers(getRunCategorizationRulesMockHandler(failWithStatus(500))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /^(preview|peržiūrėti)$/i }));
    await userEvent.click(await canvas.findByRole("button", { name: /apply to|pritaikyti/i }));
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
  },
};
