import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { getUpdateSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { accounts, serverErrorProblem, settings } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { SettingsForm } from "./settings-form";

const meta = {
  title: "Features/Settings/SettingsForm",
  component: SettingsForm,
  parameters: { layout: "padded", route: "/settings" },
  args: {
    section: "general",
    settings,
    accounts,
    exchangeRates: null,
  },
} satisfies Meta<typeof SettingsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const instanceName = /installation name|sistemos pavadinimas/i;
const save = /^(save|išsaugoti)$/i;

export const General: Story = {};

export const Features: Story = { args: { section: "features" } };

export const Currencies: Story = { args: { section: "currencies" } };

export const Regional: Story = { args: { section: "regional" } };

export const Defaults: Story = { args: { section: "defaults" } };

export const NoAccounts: Story = { args: { section: "defaults", accounts: [] } };

export const Saving: Story = {
  parameters: withHandlers(getUpdateSettingsMockHandler(pending)),
  play: async ({ canvas }) => {
    await fireEvent.change(await canvas.findByLabelText(instanceName), {
      target: { value: "Kazlauskai" },
    });
    await userEvent.click(await canvas.findByRole("button", { name: save }));

    await waitFor(() =>
      expect(
        canvas.getByRole("button", { name: /discard changes|atmesti pakeitimus/i }),
      ).toBeDisabled(),
    );
  },
};

const sent = fn();

export const SavesTrimmedName: Story = {
  parameters: withHandlers(
    getUpdateSettingsMockHandler(async ({ request }) => {
      sent(await request.json());
      return { ...settings, instanceName: "Kazlauskai" };
    }),
  ),
  play: async ({ canvas }) => {
    sent.mockClear();
    await fireEvent.change(await canvas.findByLabelText(instanceName), {
      target: { value: "  Kazlauskai  " },
    });
    await userEvent.click(await canvas.findByRole("button", { name: save }));

    await waitFor(() =>
      expect(sent).toHaveBeenCalledWith(expect.objectContaining({ instanceName: "Kazlauskai" })),
    );
    await expect(sent).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(canvas.queryByRole("status")).toBeNull());
  },
};

export const SaveFails: Story = {
  parameters: withHandlers(getUpdateSettingsMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    await fireEvent.change(await canvas.findByLabelText(instanceName), {
      target: { value: "Kazlauskai" },
    });
    await userEvent.click(await canvas.findByRole("button", { name: save }));

    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
    await expect(canvas.getByRole("status")).toBeInTheDocument();
  },
};

export const DiscardRestoresValues: Story = {
  play: async ({ canvas }) => {
    const name = await canvas.findByLabelText(instanceName);
    await fireEvent.change(name, { target: { value: "Something else" } });
    await userEvent.click(
      await canvas.findByRole("button", { name: /discard changes|atmesti pakeitimus/i }),
    );

    await expect(name).toHaveValue(settings.instanceName ?? "");
    await expect(canvas.queryByRole("status")).toBeNull();
  },
};
