import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import type { AssetResponse } from "@/api/generated/model";
import { getAssetsMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { assets, sharedAsset, sharedByPartner } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { AssetsSection } from "./assets-section";

const api = mockApi();

async function renderWith(shared: AssetResponse) {
  api.use(getAssetsMockHandler([shared, ...assets.slice(1)]));
  renderInApp(<AssetsSection />, { path: "/net-worth" });
  await screen.findByText(shared.name);
}

async function editDialog(name: string) {
  const dialog = await screen.findByRole("dialog", { name: `Edit: ${name}` });
  await waitFor(() => expect(dialog).toBeVisible());
  return within(dialog);
}

test("the owner of a shared asset may delete it and change its visibility", async () => {
  await renderWith(sharedAsset);

  await userEvent.click(screen.getByRole("button", { name: `Actions: ${sharedAsset.name}` }));
  expect(await screen.findByRole("menuitem", { name: "Delete" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));

  expect(
    await (await editDialog(sharedAsset.name)).findByRole("combobox", { name: "Visibility" }),
  ).toBeInTheDocument();
});

test("another member edits a shared asset but cannot delete it or change its visibility", async () => {
  const partners = sharedByPartner(sharedAsset);
  await renderWith(partners);

  expect(screen.queryByRole("button", { name: `Actions: ${partners.name}` })).toBeNull();
  expect(screen.queryByRole("button", { name: `Delete: ${partners.name}` })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: `Edit: ${partners.name}` }));

  const dialog = await editDialog(partners.name);
  expect(dialog.getByRole("textbox", { name: "Name" })).toHaveValue(partners.name);
  expect(dialog.queryByRole("combobox", { name: "Visibility" })).toBeNull();
});
