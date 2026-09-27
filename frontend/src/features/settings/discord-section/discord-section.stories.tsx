import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { getUpdateDiscordSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { serverErrorProblem } from "@/storybook/fixtures";
import { discordOffHandler, failWith, withHandlers } from "@/storybook/handlers";
import { DiscordSection } from "./discord-section";

const meta = {
  title: "Features/Settings/DiscordSection",
  component: DiscordSection,
  parameters: { layout: "padded", route: "/settings" },
} satisfies Meta<typeof DiscordSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Allow Discord notifications" }),
    ).toBeChecked();
  },
};

export const Off: Story = {
  parameters: withHandlers(discordOffHandler),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Allow Discord notifications" }),
    ).not.toBeChecked();
  },
};

export const SwitchingOn: Story = {
  parameters: withHandlers(discordOffHandler),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: "Allow Discord notifications" }),
    );
    const save = canvas.getByRole("button", { name: "Save" });
    await userEvent.click(save);
    await waitFor(() => expect(save).toBeEnabled());
  },
};

export const SaveFails: Story = {
  parameters: withHandlers(getUpdateDiscordSettingsMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("checkbox", { name: "Allow Discord notifications" }),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
  },
};
