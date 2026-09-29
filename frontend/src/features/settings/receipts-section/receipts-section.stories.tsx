import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor } from "storybook/test";
import {
  getReceiptSettingsMockHandler,
  getTestReceiptKeyMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  receiptKeyRejectedProblem,
  receiptSettingsEmpty,
  receiptSettingsOverLimit,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { ReceiptsSection } from "./receipts-section";

const meta = {
  title: "Features/Settings/ReceiptsSection",
  component: ReceiptsSection,
  parameters: { layout: "padded", route: "/settings" },
} satisfies Meta<typeof ReceiptsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saved: Story = {
  play: async ({ canvas }) => {
    const key = await canvas.findByLabelText("Anthropic API key");
    await expect(key).toHaveValue("");
    await expect(key).toHaveAttribute("placeholder", "A key is saved");
    await expect(canvas.getByText("This month: 23 of 100 reads")).toBeVisible();
    await expect(
      canvas.getByText(/sends the photo or PDF of a receipt to Anthropic/u),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: withHandlers(getReceiptSettingsMockHandler(receiptSettingsEmpty)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Anthropic API key")).not.toHaveAttribute(
      "placeholder",
    );
    await expect(canvas.getByRole("button", { name: /Test the key/u })).toBeDisabled();
  },
};

export const SwitchingOnNeedsAKey: Story = {
  parameters: withHandlers(getReceiptSettingsMockHandler(receiptSettingsEmpty)),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: "Read receipts when someone asks" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(canvas.getAllByText("This field is required.").length).toBeGreaterThan(0),
    );
  },
};

export const SavingAKey: Story = {
  parameters: withHandlers(getReceiptSettingsMockHandler(receiptSettingsEmpty)),
  play: async ({ canvas }) => {
    await fireEvent.change(await canvas.findByLabelText("Anthropic API key"), {
      target: { value: "sk-ant-example" },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(canvas.getByLabelText("Anthropic API key")).toHaveValue(""));
  },
};

export const OverTheLimit: Story = {
  parameters: withHandlers(getReceiptSettingsMockHandler(receiptSettingsOverLimit)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("This month: 100 of 100 reads")).toBeVisible();
  },
};

export const KeyRejected: Story = {
  parameters: withHandlers(getTestReceiptKeyMockHandler(failWith(receiptKeyRejectedProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Test the key/u }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/did not accept the API key/u);
  },
};

export const Loading: Story = {
  parameters: withHandlers(getReceiptSettingsMockHandler(pending)),
};

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Anthropic API raktas")).toBeVisible();
    await expect(canvas.getByText("Šį mėnesį: 23 iš 100 skaitymų")).toBeVisible();
  },
};
