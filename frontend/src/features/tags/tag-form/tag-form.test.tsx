import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { getCreateTagMockHandler } from "@/api/generated/tags/tags.msw";
import { duplicateTagProblem, familyHousehold, ids, tags } from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { mockApi, renderInApp } from "@/test/api";
import { TagForm } from "./tag-form";

const api = mockApi();
const holiday = tags.find((tag) => tag.id === ids.tags.holiday)!;

async function nameBox() {
  return screen.findByRole("textbox", { name: "Name" });
}

test("a new tag is sent trimmed and personal, and the form closes", async () => {
  const onClose = vi.fn();
  renderInApp(<TagForm onClose={onClose} />);

  fireEvent.change(await nameBox(), { target: { value: "  Remontas " } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(await api.lastBody("POST", "/api/tags")).toEqual({
    name: "Remontas",
    scope: "personal",
    householdId: null,
  });
});

test("an empty name is refused on the field and nothing is sent", async () => {
  renderInApp(<TagForm onClose={vi.fn()} />);

  fireEvent.click(await screen.findByRole("button", { name: "Add" }));

  await waitFor(() => expect(screen.getByRole("textbox", { name: "Name" })).toBeInvalid());
  expect(api.sent("POST", "/api/tags")).toHaveLength(0);
});

test("a duplicate name keeps the form open with the server's reason", async () => {
  api.use(getCreateTagMockHandler(failWith(duplicateTagProblem)));
  const onClose = vi.fn();
  renderInApp(<TagForm onClose={onClose} />);

  fireEvent.change(await nameBox(), { target: { value: "Atostogos 2026" } });
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});

test("editing starts from the tag's name and saves it under its id", async () => {
  const onClose = vi.fn();
  renderInApp(<TagForm initial={holiday} onClose={onClose} />);

  expect(await nameBox()).toHaveValue(holiday.name);
  fireEvent.change(await nameBox(), { target: { value: "Atostogos Ispanijoje" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(api.sent("PUT", `/api/tags/${holiday.id}`)).toHaveLength(1);
});

test("a shared tag is sent with the household it is shared with", async () => {
  const onClose = vi.fn();
  renderInApp(<TagForm onClose={onClose} />);

  fireEvent.change(await nameBox(), { target: { value: "Sodas" } });
  await userEvent.click(screen.getByRole("combobox", { name: "Visibility" }));
  await userEvent.click(await screen.findByRole("option", { name: "Shared" }));
  await userEvent.click(await screen.findByRole("combobox", { name: "Household" }));
  await userEvent.click(await screen.findByRole("option", { name: familyHousehold.name }));
  fireEvent.click(screen.getByRole("button", { name: "Add" }));

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(await api.lastBody("POST", "/api/tags")).toEqual({
    name: "Sodas",
    scope: "shared",
    householdId: familyHousehold.id,
  });
});
