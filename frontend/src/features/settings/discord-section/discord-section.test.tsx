import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  getDiscordSettingsMockHandler,
  getSendTestDiscordMockHandler,
  getUpdateDiscordSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  discordSettingsEmpty,
  discordSettingsGone,
  discordSettingsUnreadable,
  discordWebhookGoneProblem,
  serverErrorProblem,
} from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { mockApi, renderInApp } from "@/test/api";
import { DiscordSection } from "./discord-section";

const api = mockApi();
const webhook = "https://discord.com/api/webhooks/123456789012345678/abc-DEF_123";

async function enabledBox() {
  return screen.findByRole("checkbox", { name: "Send notifications to Discord" });
}

test("a new webhook is sent trimmed with the switch, confirmed and the field emptied", async () => {
  api.use(getDiscordSettingsMockHandler(discordSettingsEmpty));
  renderInApp(<DiscordSection />);

  fireEvent.click(await enabledBox());
  const url = screen.getByLabelText("Webhook URL");
  fireEvent.change(url, { target: { value: ` ${webhook} ` } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Discord settings saved")).toBeInTheDocument();
  expect(await api.lastBody("PUT", "/api/settings/discord")).toEqual({
    enabled: true,
    webhookUrl: webhook,
  });
  await waitFor(() => expect(url).toHaveValue(""));
});

test("saving with a webhook already stored keeps it by sending no URL", async () => {
  renderInApp(<DiscordSection />);

  expect(await enabledBox()).toBeChecked();
  fireEvent.click(await enabledBox());
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(api.sent("PUT", "/api/settings/discord")).toHaveLength(1));
  expect(await api.lastBody("PUT", "/api/settings/discord")).toEqual({
    enabled: false,
    webhookUrl: null,
  });
});

test("a URL that is not a Discord webhook is refused on the field and nothing is sent", async () => {
  api.use(getDiscordSettingsMockHandler(discordSettingsEmpty));
  renderInApp(<DiscordSection />);

  const url = await screen.findByLabelText("Webhook URL");
  fireEvent.change(url, { target: { value: "https://example.com/hook" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(
    await screen.findByText(/starts with https:\/\/discord\.com\/api\/webhooks/u),
  ).toBeInTheDocument();
  expect(url).toHaveAttribute("aria-invalid", "true");
  expect(api.sent("PUT", "/api/settings/discord")).toHaveLength(0);
});

test("switching on without a saved webhook asks for one and sends nothing", async () => {
  api.use(getDiscordSettingsMockHandler(discordSettingsEmpty));
  renderInApp(<DiscordSection />);

  fireEvent.click(await enabledBox());
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("This field is required.")).toBeInTheDocument();
  expect(api.sent("PUT", "/api/settings/discord")).toHaveLength(0);
});

test("a failed save is shown in the form", async () => {
  api.use(getUpdateDiscordSettingsMockHandler(failWith(serverErrorProblem)));
  renderInApp(<DiscordSection />);

  fireEvent.click(await enabledBox());
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByRole("alert")).toBeInTheDocument();
});

test("a test message is posted and confirmed", async () => {
  renderInApp(<DiscordSection />);

  fireEvent.click(await screen.findByRole("button", { name: /Send a test message/u }));

  expect(await screen.findByText("Test message posted to Discord")).toBeInTheDocument();
  expect(api.sent("POST", "/api/settings/discord/test")).toHaveLength(1);
});

test("a test message Discord refuses shows the reason", async () => {
  api.use(getSendTestDiscordMockHandler(failWith(discordWebhookGoneProblem)));
  renderInApp(<DiscordSection />);

  fireEvent.click(await screen.findByRole("button", { name: /Send a test message/u }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/no longer exists/u);
});

test("without a saved webhook no test message can be sent", async () => {
  api.use(getDiscordSettingsMockHandler(discordSettingsEmpty));
  renderInApp(<DiscordSection />);

  expect(await screen.findByRole("button", { name: /Send a test message/u })).toBeDisabled();
});

test("a webhook Discord deleted or that cannot be read is called out", async () => {
  api.use(getDiscordSettingsMockHandler(discordSettingsGone));
  const { unmount } = renderInApp(<DiscordSection />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/no longer exists/u);
  unmount();

  api.use(getDiscordSettingsMockHandler(discordSettingsUnreadable));
  renderInApp(<DiscordSection />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/can no longer be read/u);
});
