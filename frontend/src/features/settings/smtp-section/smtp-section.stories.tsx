import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import {
  getSendTestEmailMockHandler,
  getSmtpSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  emailNotConfiguredProblem,
  smtpSendFailedProblem,
  smtpSettingsOff,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { SmtpSection } from "./smtp-section";

const meta = {
  title: "Features/Settings/SmtpSection",
  component: SmtpSection,
  parameters: { layout: "padded", route: "/settings" },
} satisfies Meta<typeof SmtpSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText("Server")).toHaveValue("smtp.example.lt");
    await expect(canvas.getByLabelText("Port")).toHaveValue("587");
    await expect(canvas.getByLabelText("Password")).toHaveValue("");
    await expect(canvas.getByText(/A password is stored/u)).toBeInTheDocument();
  },
};

export const NotConfiguredYet: Story = {
  parameters: withHandlers(getSmtpSettingsMockHandler(smtpSettingsOff)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText("Server")).toHaveValue("");
    await expect(canvas.getByRole("button", { name: /Send a test message/u })).toBeDisabled();
  },
};

export const TestMessageSent: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const test = await canvas.findByRole("button", { name: /Send a test message/u });
    await userEvent.click(test);
    await waitFor(() => expect(test).toBeEnabled());
  },
};

export const TestMessageRefused: Story = {
  parameters: withHandlers(getSendTestEmailMockHandler(failWith(smtpSendFailedProblem, 400))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /Send a test message/u }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/535 5\.7\.8/u);
  },
};

export const TestMessageWithoutSettings: Story = {
  parameters: withHandlers(getSendTestEmailMockHandler(failWith(emailNotConfiguredProblem, 400))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /Send a test message/u }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/cannot send email yet/u);
  },
};

export const SwitchingOnNeedsAServer: Story = {
  parameters: withHandlers(getSmtpSettingsMockHandler(smtpSettingsOff)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const enabled = await canvas.findByRole("checkbox", {
      name: "Send email from this installation",
    });
    await userEvent.click(enabled);
    const host = canvas.getByLabelText("Server");
    await fireEvent.change(host, { target: { value: "smtp.example.lt" } });
    await fireEvent.change(host, { target: { value: "" } });
    await waitFor(() =>
      expect(canvas.getAllByText("This field is required.").length).toBeGreaterThan(0),
    );
  },
};

export const SavingAPassword: Story = {
  parameters: withHandlers(getSmtpSettingsMockHandler(smtpSettingsOff)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(await canvas.findByLabelText("Server"), {
      target: { value: "smtp.example.lt" },
    });
    await fireEvent.change(canvas.getByLabelText("Sender address"), {
      target: { value: "finance@example.lt" },
    });
    await fireEvent.change(canvas.getByLabelText("User name"), {
      target: { value: "finance@example.lt" },
    });
    await fireEvent.change(canvas.getByLabelText("Password"), { target: { value: "s3cret" } });
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(canvas.getByLabelText("Password")).toHaveValue(""));
  },
};

export const Loading: Story = {
  parameters: withHandlers(getSmtpSettingsMockHandler(pending)),
};
