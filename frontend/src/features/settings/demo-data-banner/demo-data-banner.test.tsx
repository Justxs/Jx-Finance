import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { UserRole } from "@/lib/user-role";
import { currentUser, settingsWith } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { DemoDataBanner } from "./demo-data-banner";

const api = mockApi();

test("an administrator removes the demo data after confirming", async () => {
  api.use(getSettingsMockHandler(settingsWith({ demoData: true })));
  renderInApp(<DemoDataBanner />);

  fireEvent.click(await screen.findByRole("button", { name: "Start for real" }));
  const dialog = await screen.findByRole("alertdialog");
  expect(dialog).toHaveTextContent("including anything you added since the demo data was loaded");
  expect(api.sent("DELETE", "/api/setup/demo-data")).toHaveLength(0);

  fireEvent.click(within(dialog).getByRole("button", { name: "Start for real" }));

  await waitFor(() => expect(api.sent("DELETE", "/api/setup/demo-data")).toHaveLength(1));
});

test("members never see the banner", async () => {
  api.use(
    getSettingsMockHandler(settingsWith({ demoData: true })),
    getMeMockHandler({ ...currentUser, role: UserRole.member }),
  );
  renderInApp(<DemoDataBanner />);

  await waitFor(() => expect(api.sent("GET", "/api/auth/me")).toHaveLength(1));
  expect(screen.queryByRole("button", { name: "Start for real" })).toBeNull();
});
