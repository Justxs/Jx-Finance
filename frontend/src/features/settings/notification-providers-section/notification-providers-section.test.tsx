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
