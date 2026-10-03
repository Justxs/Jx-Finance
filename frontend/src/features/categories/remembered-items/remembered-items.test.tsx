import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { getReceiptItemCategoriesMockHandler } from "@/api/generated/receipts/receipts.msw";
import { noRememberedItemCategories, rememberedItemCategories } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { RememberedItems } from "./remembered-items";

const api = mockApi();
const milk = rememberedItemCategories.items[0]!;
const ITEMS = "/api/receipts/item-categories";

async function confirmDialog() {
  const dialog = await screen.findByRole("alertdialog");
  await waitFor(() => expect(dialog).toBeVisible());
  return within(dialog);
}

test("each remembered item shows its category, or says the category is gone", async () => {
  renderInApp(<RememberedItems />);

  expect(await screen.findByText("dantu pasta colgate")).toBeInTheDocument();
  expect(screen.getAllByText(/^Sveikata · last used/u)).toHaveLength(2);
  expect(screen.getByText(/^Deleted or unshared category · last used/u)).toBeInTheDocument();
});

test("cancelling the forget dialog sends nothing", async () => {
  renderInApp(<RememberedItems />);

  await userEvent.click(await screen.findByRole("button", { name: `Forget: ${milk.key}` }));
  const dialog = await confirmDialog();
  expect(dialog.getByRole("heading", { name: "Forget this item?" })).toBeInTheDocument();
  await userEvent.click(dialog.getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(api.sent("DELETE", `${ITEMS}/${milk.id}`)).toHaveLength(0);
});

test("forgetting an item deletes it by id", async () => {
  renderInApp(<RememberedItems />);

  await userEvent.click(await screen.findByRole("button", { name: `Forget: ${milk.key}` }));
  await userEvent.click((await confirmDialog()).getByRole("button", { name: "Forget" }));

  await waitFor(() => expect(api.sent("DELETE", `${ITEMS}/${milk.id}`)).toHaveLength(1));
});

test("a search is sent to the server and an empty answer says nothing matches", async () => {
  api.use(
    getReceiptItemCategoriesMockHandler(({ request }) =>
      new URL(request.url).searchParams.get("search")
        ? noRememberedItemCategories
        : rememberedItemCategories,
    ),
  );
  renderInApp(<RememberedItems />);

  fireEvent.change(await screen.findByRole("searchbox", { name: "Find an item" }), {
    target: { value: "kava" },
  });

  expect(await screen.findByText("No remembered item matches this search.")).toBeInTheDocument();
  const searched = api.sent("GET", ITEMS).map((request) => new URL(request.url));
  expect(searched.at(-1)?.searchParams.get("search")).toBe("kava");
});

test("with nothing remembered the section explains where items come from", async () => {
  api.use(getReceiptItemCategoriesMockHandler(noRememberedItemCategories));
  renderInApp(<RememberedItems />);

  expect(await screen.findByText(/^Nothing remembered yet/u)).toBeInTheDocument();
});

test("a longer dictionary than shown points to the search", async () => {
  api.use(getReceiptItemCategoriesMockHandler({ ...rememberedItemCategories, total: 340 }));
  renderInApp(<RememberedItems />);

  expect(
    await screen.findByText("Showing the 4 most recently used of 340. Search to find the others."),
  ).toBeInTheDocument();
});
