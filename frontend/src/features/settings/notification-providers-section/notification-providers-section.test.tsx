import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { mockApi, renderInApp } from "@/test/api";
import { NotificationProvidersSection } from "./notification-providers-section";

mockApi();

test("email opens first and the Discord tab swaps in the Discord settings", async () => {
  renderInApp(<NotificationProvidersSection />);

  expect(await screen.findByLabelText("Server")).toHaveValue("smtp.example.lt");
  fireEvent.click(screen.getByRole("tab", { name: "Discord" }));

  expect(
    await screen.findByRole("checkbox", { name: "Send notifications to Discord" }),
  ).toBeChecked();
  expect(screen.queryByLabelText("Server")).toBeNull();
});

test("the Telegram tab swaps in the Telegram settings", async () => {
  renderInApp(<NotificationProvidersSection />);

  expect(await screen.findByLabelText("Server")).toHaveValue("smtp.example.lt");
  fireEvent.click(screen.getByRole("tab", { name: "Telegram" }));

  expect(
    await screen.findByRole("checkbox", { name: "Send notifications to Telegram" }),
  ).toBeChecked();
  expect(screen.getByLabelText("Group chat id")).toHaveValue("-1001234567890");
});
