import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent } from "storybook/test";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { getRemoveDemoDataMockHandler } from "@/api/generated/setup/setup.msw";
import { withWidth } from "@/storybook/decorators";
import { serverErrorProblem, settingsWith } from "@/storybook/fixtures";
import { failWith, withHandlers } from "@/storybook/handlers";
import { DemoDataBanner } from "./demo-data-banner";

const demoSettings = getSettingsMockHandler(settingsWith({ demoData: true }));

const meta = {
  title: "Features/Settings/DemoDataBanner",
  component: DemoDataBanner,
  decorators: [withWidth("wide")],
  parameters: withHandlers(demoSettings),
} satisfies Meta<typeof DemoDataBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: /^(start for real|pradėti iš tikrųjų)$/iu }),
    );
    await expect(await screen.findByRole("alertdialog")).toBeVisible();
  },
};

export const RemoveFails: Story = {
  parameters: withHandlers(
    demoSettings,
    getRemoveDemoDataMockHandler(
      failWith({ ...serverErrorProblem, instance: "/api/setup/demo-data" }),
    ),
  ),
};

export const NoDemoData: Story = {
  parameters: withHandlers(getSettingsMockHandler(settingsWith({ demoData: false }))),
};
