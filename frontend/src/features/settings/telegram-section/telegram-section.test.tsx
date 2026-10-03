import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import {
  getSendTestTelegramMockHandler,
  getTelegramSettingsMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  telegramBotRemovedProblem,
  telegramSettings,
  telegramSettingsEmpty,
  telegramSettingsRemoved,
  telegramSettingsUnreadable,
} from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { mockApi, renderInApp } from "@/test/api";
import { TelegramSection } from "./telegram-section";

const api = mockApi();
const token = "123456789:AAEhBP0av18z2kPqhh1EbM3Xyh9ZNeC9Q1k";

async function enabledBox() {
  return screen.findByRole("checkbox", { name: "Send notifications to Telegram" });
}

test("a new bot is sent trimmed with its group as a number and the token field emptied", async () => {
  api.use(getTelegramSettingsMockHandler(telegramSettingsEmpty));
  renderInApp(<TelegramSection />);

  fireEvent.click(await enabledBox());
  const field = screen.getByLabelText("Bot token");
  fireEvent.change(field, { target: { value: ` ${token} ` } });
  fireEvent.change(screen.getByLabelText("Group chat id"), {
    target: { value: " -1001234567890 " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Telegram settings saved")).toBeInTheDocument();
  expect(await api.lastBody("PUT", "/api/settings/telegram")).toEqual({
    enabled: true,
    botToken: token,
    chatId: -1001234567890,
  });
  await waitFor(() => expect(field).toHaveValue(""));
});

test("saving with a token already stored keeps it by sending none", async () => {
  renderInApp(<TelegramSection />);

  fireEvent.click(await enabledBox());
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(api.sent("PUT", "/api/settings/telegram")).toHaveLength(1));
  expect(await api.lastBody("PUT", "/api/settings/telegram")).toEqual({
    enabled: false,
    botToken: null,
    chatId: -1001234567890,
  });
});

test("a malformed token or group id is refused on the field and nothing is sent", async () => {
  api.use(getTelegramSettingsMockHandler(telegramSettingsEmpty));
  renderInApp(<TelegramSection />);

  fireEvent.change(await screen.findByLabelText("Bot token"), { target: { value: "123:short" } });
  fireEvent.change(screen.getByLabelText("Group chat id"), { target: { value: "group" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText(/looks like 123456789:AAE/u)).toBeInTheDocument();
  expect(screen.getByText(/a whole number such as -1001234567890/u)).toBeInTheDocument();
  expect(api.sent("PUT", "/api/settings/telegram")).toHaveLength(0);
});

test("a group id too large to send exactly is refused", async () => {
  api.use(getTelegramSettingsMockHandler(telegramSettingsEmpty));
  renderInApp(<TelegramSection />);

  fireEvent.change(await screen.findByLabelText("Group chat id"), {
    target: { value: "-9999999999999999" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText(/a whole number such as -1001234567890/u)).toBeInTheDocument();
  expect(api.sent("PUT", "/api/settings/telegram")).toHaveLength(0);
});

test("a test that followed the group to a supergroup shows the new group id", async () => {
  let chatId = telegramSettings.chatId;
  api.use(
    getTelegramSettingsMockHandler(() => ({ ...telegramSettings, chatId })),
    getSendTestTelegramMockHandler(() => {
      chatId = -1009876543210;
    }),
  );
  renderInApp(<TelegramSection />);

  expect(await screen.findByLabelText("Group chat id")).toHaveValue("-1001234567890");
  fireEvent.click(screen.getByRole("button", { name: /Send a test message/u }));

  await waitFor(() => expect(screen.getByLabelText("Group chat id")).toHaveValue("-1009876543210"));
});

test("switching on without a token and a group asks for both and sends nothing", async () => {
  api.use(getTelegramSettingsMockHandler(telegramSettingsEmpty));
  renderInApp(<TelegramSection />);

  fireEvent.click(await enabledBox());
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findAllByText("This field is required.")).toHaveLength(2);
  expect(api.sent("PUT", "/api/settings/telegram")).toHaveLength(0);
});

test("a test message is posted, or the reason Telegram refused it is shown", async () => {
  const { unmount } = renderInApp(<TelegramSection />);
  fireEvent.click(await screen.findByRole("button", { name: /Send a test message/u }));
  expect(await screen.findByText("Test message posted to Telegram")).toBeInTheDocument();
  unmount();

  api.use(getSendTestTelegramMockHandler(failWith(telegramBotRemovedProblem)));
  renderInApp(<TelegramSection />);
  fireEvent.click(await screen.findByRole("button", { name: /Send a test message/u }));
  expect(await screen.findByRole("alert")).toHaveTextContent(/removed from the group/u);
});

test("without a saved bot no test message can be sent", async () => {
  api.use(getTelegramSettingsMockHandler(telegramSettingsEmpty));
  renderInApp(<TelegramSection />);

  expect(await screen.findByRole("button", { name: /Send a test message/u })).toBeDisabled();
});

test("a removed bot or a token that cannot be read is called out", async () => {
  api.use(getTelegramSettingsMockHandler(telegramSettingsRemoved));
  const { unmount } = renderInApp(<TelegramSection />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/removed from the group/u);
  unmount();

  api.use(getTelegramSettingsMockHandler(telegramSettingsUnreadable));
  renderInApp(<TelegramSection />);
  expect(await screen.findByRole("alert")).toHaveTextContent(/can no longer be read/u);
});
