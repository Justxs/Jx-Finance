import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { twoFactorRecoveryCodes } from "@/storybook/fixtures";
import { TwoFactorRecoveryCodes } from "./two-factor-recovery-codes";

const meta = {
  title: "Features/Profile/TwoFactorRecoveryCodes",
  component: TwoFactorRecoveryCodes,
  args: { codes: twoFactorRecoveryCodes.recoveryCodes ?? [], onDone: fn() },
  decorators: [withWidth("w-[28rem] max-w-full")],
} satisfies Meta<typeof TwoFactorRecoveryCodes>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleCode: Story = { args: { codes: ["7KQ2M-X9PLD"] } };

export const NoCodes: Story = { args: { codes: [] } };

export const LongCodes: Story = {
  args: {
    codes: [
      "7KQ2M-X9PLD-B4TNV-R6HWC-ZP83J",
      "M2DXC-Q7LRT-H9WVB-3KNSE-T6RFA",
      "C5GLY-W2ZQH-N8ESK-4VBTD-R3JHP",
    ],
  },
};

export const Narrow: Story = {
  decorators: [withWidth("w-64")],
};
