import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  getSendTestEmailMockHandler,
  getSmtpSettingsMockHandler,
  getUpdateSmtpSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  serverErrorProblem,
  smtpSendFailedProblem,
  smtpSettings,
  smtpSettingsOff,
  smtpTestSent,
} from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { mockApi, renderInApp } from "@/test/api";
import { SmtpSection } from "./smtp-section";

const api = mockApi();

function change(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

test("a new mail server is sent trimmed with its password, confirmed and the password emptied", async () => {
  api.use(getSmtpSettingsMockHandler(smtpSettingsOff));
  renderInApp(<SmtpSection />);

  fireEvent.click(
    await screen.findByRole("checkbox", { name: "Send email from this installation" }),
  );
  change("Server", " smtp.example.lt ");
  change("Port", "465");
  change("User name", "finance@example.lt");
  change("Password", "s3cret");
  change("Sender address", "finance@example.lt");
  change("Sender name", "  ");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Mail server saved")).toBeInTheDocument();
  expect(await api.lastBody("PUT", "/api/settings/smtp")).toEqual({
    enabled: true,
    host: "smtp.example.lt",
    port: 465,
    encryption: "startTls",
    userName: "finance@example.lt",
    password: "s3cret",
    fromAddress: "finance@example.lt",
    fromName: null,
  });
  await waitFor(() => expect(screen.getByLabelText("Password")).toHaveValue(""));
});

test("an empty password field keeps the stored password by sending none", async () => {
  renderInApp(<SmtpSection />);

  expect(await screen.findByText(/A password is stored/u)).toBeInTheDocument();
  change("Sender name", "Household finance");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(api.sent("PUT", "/api/settings/smtp")).toHaveLength(1));
  expect(await api.lastBody("PUT", "/api/settings/smtp")).toMatchObject({
    host: smtpSettings.host,
    password: null,
    fromName: "Household finance",
  });
});

test("switching on without a server and sender is refused and nothing is sent", async () => {
  api.use(getSmtpSettingsMockHandler(smtpSettingsOff));
  renderInApp(<SmtpSection />);

  fireEvent.click(
    await screen.findByRole("checkbox", { name: "Send email from this installation" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(screen.getByLabelText("Server")).toBeInvalid());
  expect(screen.getByLabelText("Sender address")).toBeInvalid();
  expect(api.sent("PUT", "/api/settings/smtp")).toHaveLength(0);
});

test("a port outside 1 to 65535 is refused and nothing is sent", async () => {
  renderInApp(<SmtpSection />);

  fireEvent.change(await screen.findByLabelText("Port"), {
    target: { value: "70000" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Enter a whole number from 1 to 65535.")).toBeInTheDocument();
  expect(api.sent("PUT", "/api/settings/smtp")).toHaveLength(0);
});

test("a failed save is shown in the form", async () => {
  api.use(getUpdateSmtpSettingsMockHandler(failWith(serverErrorProblem)));
  renderInApp(<SmtpSection />);

  fireEvent.change(await screen.findByLabelText("Sender name"), {
    target: { value: "Household finance" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByRole("alert")).toBeInTheDocument();
});

test("a test message names the address it went to", async () => {
  renderInApp(<SmtpSection />);

  fireEvent.click(await screen.findByRole("button", { name: /Send a test message/u }));

  expect(
    await screen.findByText(`Test message sent to ${smtpTestSent.sentTo}`),
  ).toBeInTheDocument();
});

test("a test message the mail server refuses shows its answer", async () => {
  api.use(getSendTestEmailMockHandler(failWith(smtpSendFailedProblem)));
  renderInApp(<SmtpSection />);

  fireEvent.click(await screen.findByRole("button", { name: /Send a test message/u }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/535 5\.7\.8/u);
});

test("with email switched off no test message can be sent", async () => {
  api.use(getSmtpSettingsMockHandler(smtpSettingsOff));
  renderInApp(<SmtpSection />);

  expect(await screen.findByRole("button", { name: /Send a test message/u })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});
