import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { accounts, settings } from "@/storybook/fixtures";
import { SettingsForm } from "./settings-form";

const meta = {
  title: "Features/Settings/SettingsForm",
  component: SettingsForm,
  parameters: { layout: "padded", route: "/settings" },
  args: {
    section: "general",
    settings,
    accounts,
    pending: false,
    exchangeRates: null,
    onSubmit: fn((_values, onSaved: () => void) => onSaved()),
  },
} satisfies Meta<typeof SettingsForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const General: Story = {};

export const Features: Story = { args: { section: "features" } };

export const Currencies: Story = { args: { section: "currencies" } };

export const Regional: Story = { args: { section: "regional" } };

export const Defaults: Story = { args: { section: "defaults" } };

export const NoAccounts: Story = { args: { section: "defaults", accounts: [] } };

export const Saving: Story = {
  args: { pending: true, onSubmit: fn() },
  play: async ({ canvas }) => {
    await fireEvent.change(
      await canvas.findByLabelText(/installation name|sistemos pavadinimas/i),
      {
        target: { value: "Kazlauskai" },
      },
    );

    await expect(
      await canvas.findByRole("button", { name: /discard changes|atmesti pakeitimus/i }),
    ).toBeDisabled();
  },
};

export const SavesTrimmedName: Story = {
  play: async ({ args, canvas }) => {
    await fireEvent.change(
      await canvas.findByLabelText(/installation name|sistemos pavadinimas/i),
      {
        target: { value: "  Kazlauskai  " },
      },
    );
    await userEvent.click(await canvas.findByRole("button", { name: /^(save|išsaugoti)$/i }));

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ instanceName: "Kazlauskai" }),
        expect.any(Function),
      ),
    );
    await expect(args.onSubmit).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(canvas.queryByRole("status")).toBeNull());
  },
};

export const DiscardRestoresValues: Story = {
  play: async ({ args, canvas }) => {
    const name = await canvas.findByLabelText(/installation name|sistemos pavadinimas/i);
    await fireEvent.change(name, { target: { value: "Something else" } });
    await userEvent.click(
      await canvas.findByRole("button", { name: /discard changes|atmesti pakeitimus/i }),
    );

    await expect(name).toHaveValue(settings.instanceName ?? "");
    await expect(canvas.queryByRole("status")).toBeNull();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
