import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import {
  getCreateCategoryMockHandler,
  getUpdateCategoryMockHandler,
} from "@/api/generated/categories/categories.msw";
import { setActiveHousehold } from "@/stores/active-household-store";
import { categories, familyHousehold, ids, problemOf } from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { mockApi, renderInApp } from "@/test/api";
import { CategoryForm } from "./category-form";

const api = mockApi();
const food = categories.find((category) => category.id === ids.categories.food)!;
const cafes = categories.find((category) => category.id === ids.categories.cafes)!;
const transport = categories.find((category) => category.id === ids.categories.transport)!;
const sharedGoods = categories.find((category) => category.id === ids.categories.householdGoods)!;

afterEach(() => {
  setActiveHousehold(undefined);
});

function renderForm(initial?: (typeof categories)[number]) {
  const onClose = vi.fn();
  renderInApp(<CategoryForm categories={categories} initial={initial} onClose={onClose} />);
  return onClose;
}

async function nameBox() {
  return screen.findByRole("textbox", { name: "Name" });
}

async function choose(label: string, option: string) {
  await userEvent.click(screen.getByRole("combobox", { name: label }));
  await userEvent.click(await screen.findByRole("option", { name: option }));
  await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
}

async function openedOptions(label: string) {
  await userEvent.click(screen.getByRole("combobox", { name: label }));
  const listbox = await screen.findByRole("listbox");
  return within(listbox)
    .getAllByRole("option")
    .map((option) => option.textContent);
}

test("a new category is sent trimmed, as a personal top-level expense with its icon", async () => {
  const onClose = renderForm();

  fireEvent.change(await nameBox(), { target: { value: "  Gyvūnai " } });
  await userEvent.click(screen.getByRole("radio", { name: "Paw print" }));
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(await api.lastBody("POST", "/api/categories")).toEqual({
    name: "Gyvūnai",
    type: "expense",
    icon: "paw-print",
    parentId: null,
    scope: "personal",
    householdId: null,
  });
});

test("an income category grouped under a parent sends the type and the parent's id", async () => {
  const onClose = renderForm();

  fireEvent.change(await nameBox(), { target: { value: "Premijos" } });
  await userEvent.click(screen.getByRole("radio", { name: "Income" }));
  await choose("Group under", "Atlyginimas");
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(await api.lastBody("POST", "/api/categories")).toMatchObject({
    type: "income",
    parentId: ids.categories.salary,
  });
});

test("only top-level categories of the chosen type can be a group", async () => {
  renderForm();
  await nameBox();

  const options = await openedOptions("Group under");

  expect(options).toContain("No group (top level)");
  expect(options).toContain(food.name);
  expect(options).not.toContain(cafes.name);
  expect(options).not.toContain("Atlyginimas");
});

test("switching between expense and income resets the group", async () => {
  renderForm();
  await nameBox();
  await choose("Group under", transport.name);
  expect(screen.getByRole("combobox", { name: "Group under" })).toHaveTextContent(transport.name);

  await userEvent.click(screen.getByRole("radio", { name: "Income" }));

  expect(screen.getByRole("combobox", { name: "Group under" })).toHaveTextContent(
    "No group (top level)",
  );
});

test("a category is never offered as its own group", async () => {
  renderForm(transport);
  await nameBox();

  const options = await openedOptions("Group under");

  expect(options).toContain(food.name);
  expect(options).not.toContain(transport.name);
});

test("a category with sub-categories cannot join a group, and an edit keeps its type", async () => {
  const onClose = renderForm(food);

  expect(await nameBox()).toHaveValue(food.name);
  expect(screen.queryByRole("combobox", { name: "Group under" })).not.toBeInTheDocument();
  expect(screen.queryByRole("radio", { name: "Income" })).not.toBeInTheDocument();
  fireEvent.change(await nameBox(), { target: { value: "Maistas namuose" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(await api.lastBody("PUT", `/api/categories/${food.id}`)).toEqual({
    name: "Maistas namuose",
    icon: food.icon,
    parentId: null,
    scope: "personal",
    householdId: null,
  });
});

test("editing a sub-category starts from its group and can move it to the top level", async () => {
  const onClose = renderForm(cafes);
  await nameBox();
  expect(screen.getByRole("combobox", { name: "Group under" })).toHaveTextContent(food.name);

  await choose("Group under", "No group (top level)");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(await api.lastBody("PUT", `/api/categories/${cafes.id}`)).toMatchObject({
    parentId: null,
  });
});

test("a blank or too long name is refused on the field and nothing is sent", async () => {
  renderForm();

  fireEvent.change(await nameBox(), { target: { value: "   " } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  await waitFor(() => expect(screen.getByRole("textbox", { name: "Name" })).toBeInvalid());
  expect(screen.getByText("This field is required.")).toBeInTheDocument();

  fireEvent.change(await nameBox(), { target: { value: "x".repeat(101) } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  expect(await screen.findByText("Must be 100 characters or fewer.")).toBeInTheDocument();

  expect(api.sent("POST", "/api/categories")).toHaveLength(0);
});

test("a duplicate name keeps the form open with the server's reason", async () => {
  api.use(
    getCreateCategoryMockHandler(
      failWith(
        problemOf(409, "conflict.duplicate", 'You already have a category named "Maistas".'),
      ),
    ),
  );
  const onClose = renderForm();

  fireEvent.change(await nameBox(), { target: { value: "Maistas" } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("This already exists.");
  expect(onClose).not.toHaveBeenCalled();
});

test("a group the server refuses is reported under the group field", async () => {
  api.use(
    getUpdateCategoryMockHandler(
      failWith(
        problemOf(400, "category.nestingInvalid", "Categories nest one level.", {
          name: "parentId",
        }),
      ),
    ),
  );
  const onClose = renderForm(transport);
  await nameBox();

  await choose("Group under", food.name);
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText(/Categories nest one level/u)).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Group under" })).toBeInvalid();
  expect(onClose).not.toHaveBeenCalled();
});

test("sharing needs a household, and then sends it", async () => {
  const onClose = renderForm();

  fireEvent.change(await nameBox(), { target: { value: "Sodas" } });
  await choose("Visibility", "Shared");
  fireEvent.click(screen.getByRole("button", { name: "Add" }));
  await waitFor(() => expect(screen.getByRole("combobox", { name: "Household" })).toBeInvalid());
  expect(api.sent("POST", "/api/categories")).toHaveLength(0);

  await choose("Household", familyHousehold.name);
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(await api.lastBody("POST", "/api/categories")).toMatchObject({
    scope: "shared",
    householdId: familyHousehold.id,
  });
});

test("a new category starts shared with the active household", async () => {
  setActiveHousehold(familyHousehold.id);
  renderForm();
  await nameBox();

  expect(screen.getByRole("combobox", { name: "Visibility" })).toHaveTextContent("Shared");
  expect(screen.getByRole("combobox", { name: "Household" })).toHaveTextContent(
    familyHousehold.name,
  );
});

test("making a shared category personal drops its household", async () => {
  const onClose = renderForm(sharedGoods);
  await nameBox();
  expect(screen.getByRole("combobox", { name: "Household" })).toHaveTextContent(
    familyHousehold.name,
  );

  await choose("Visibility", "Personal");
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(await api.lastBody("PUT", `/api/categories/${sharedGoods.id}`)).toMatchObject({
    scope: "personal",
    householdId: null,
  });
});
