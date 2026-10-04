import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import {
  getSettingsMockHandler,
  getUpdateSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  getFinishSetupMockHandler,
  getSetupReadinessMockHandler,
} from "@/api/generated/setup/setup.msw";
import { withWidth } from "@/storybook/decorators";
import { serverErrorProblem, settingsWith } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { SetupWizard } from "./setup-wizard";

const meta = {
  title: "Features/Settings/SetupWizard",
  component: SetupWizard,
  args: { step: "basics" },
  parameters: { route: "/setup" },
  decorators: [withWidth("full")],
} satisfies Meta<typeof SetupWizard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basics: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { level: 1 })).toHaveTextContent(
      /^(the basics|pagrindai)$/iu,
    );
    await expect(canvas.getByText(/^(basics|pagrindai)$/iu).closest("li")).toHaveAttribute(
      "aria-current",
      "step",
    );
  },
};

export const Features: Story = {
  args: { step: "features" },
  play: async ({ canvas }) => {
    const track = await canvas.findByRole("radio", {
      name: /^(track spending|išlaidų apskaita)$/iu,
    });
    await userEvent.click(track);
    await expect(track).toBeChecked();
    await expect(
      canvas.getByRole("checkbox", { name: /^(budgets|biudžetai)/iu }),
    ).not.toBeChecked();
  },
};

export const FeaturesOnABareServer: Story = {
  args: { step: "features" },
  parameters: withHandlers(getSetupReadinessMockHandler({ receiptReaderInstalled: false })),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/(needs tesseract|reikia tesseract)/iu)).toBeVisible();
    await expect(canvas.getByText(/(tile file|žemėlapio failo)/iu)).toBeVisible();
  },
};

export const Notifications: Story = {
  args: { step: "notifications" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("tab", { name: /^(email|el\. paštas)/iu })).toBeVisible();
  },
};

export const Start: Story = {
  args: { step: "start" },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("radio", { name: /^(demo data|pavyzdžiai)$/iu }));
    await expect(
      canvas.getByRole("button", { name: /^(load demo data|įkelti pavyzdinius duomenis)$/iu }),
    ).toBeVisible();
  },
};

export const StartWithDemoData: Story = {
  args: { step: "start" },
  parameters: withHandlers(getSettingsMockHandler(settingsWith({ demoData: true }))),
};

export const Tour: Story = {
  args: { step: "tour" },
  play: async ({ canvas }) => {
    await expect(await canvas.findAllByRole("heading", { level: 2 })).toHaveLength(5);
    await expect(
      canvas.getByRole("button", { name: /^(go to the dashboard|eiti į suvestinę)$/iu }),
    ).toBeVisible();
  },
};

export const SaveFails: Story = {
  parameters: withHandlers(
    getUpdateSettingsMockHandler(failWith({ ...serverErrorProblem, instance: "/api/settings" })),
  ),
};

export const SavePending: Story = {
  parameters: withHandlers(getUpdateSettingsMockHandler(pending)),
};

export const FinishPending: Story = {
  args: { step: "tour" },
  parameters: withHandlers(getFinishSetupMockHandler(pending)),
};
