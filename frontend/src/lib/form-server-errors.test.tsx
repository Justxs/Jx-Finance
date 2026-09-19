import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ApiError } from "@/api/client";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import {
  hasFormField,
  serverErrorText,
  splitServerErrors,
  submitToServer,
  unplacedServerErrors,
} from "./form-server-errors";

function problem(errors: { name: string; reason: string }[]) {
  return new ApiError({ status: 400, title: "Validation failed", errors });
}

interface HarnessProps {
  send: () => Promise<unknown>;
  error: unknown;
}

function Harness({ send, error }: Readonly<HarnessProps>) {
  const form = useAppForm({
    defaultValues: { amount: "5", lines: [{ amount: "1" }, { amount: "2" }] },
    onSubmit: (submission) => submitToServer(submission, send),
  });

  return (
    <form.AppForm>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="amount">
          {(field) => <field.MoneyInputField id="amount" label="Amount" />}
        </form.Field>
        <form.Field name="lines[1].amount">
          {(field) => <field.MoneyInputField id="line-1" label="Second line" />}
        </form.Field>
        <FormError error={error} />
        <form.SubmitButton>Save</form.SubmitButton>
      </form>
    </form.AppForm>
  );
}

test("field paths are matched against the form values", () => {
  const values = { amount: "", lines: [{ amount: "" }] };

  expect(hasFormField(values, "amount")).toBe(true);
  expect(hasFormField(values, "lines[0].amount")).toBe(true);
  expect(hasFormField(values, "lines[1].amount")).toBe(false);
  expect(hasFormField(values, "generalErrors")).toBe(false);
  expect(hasFormField(values, "")).toBe(false);
});

test("entries are split into field errors and the rest", () => {
  const error = problem([
    { name: "amount", reason: "Too small." },
    { name: "amount", reason: "Not a number." },
    { name: "accountId", reason: "Unknown account." },
  ]);

  const { fields, unplaced } = splitServerErrors({ amount: "" }, error);

  expect(fields).toEqual({ amount: ["Too small.", "Not a number."] });
  expect(unplaced.map(serverErrorText)).toEqual(["Unknown account."]);
  expect(splitServerErrors({ amount: "" }, new TypeError("offline")).unplaced).toEqual([]);
});

test("an alias maps a request property onto a differently named form field", () => {
  const error = problem([{ name: "currentValue", reason: "Too small." }]);

  const { fields, placed, unplaced } = splitServerErrors({ amount: "" }, error, {
    currentValue: "amount",
  });

  expect(fields).toEqual({ amount: ["Too small."] });
  expect(placed).toEqual(["currentValue"]);
  expect(unplaced).toEqual([]);
});

test("an error that never went through a form keeps every entry", () => {
  const error = problem([{ name: "amount", reason: "Too small." }]);

  expect(unplacedServerErrors(error)).toEqual({ placedAny: false, unplaced: error.errors });
});

test("a named field shows the server reason and clears it on edit", async () => {
  const error = problem([
    { name: "lines[1].amount", reason: "Line amount must be positive." },
    { name: "accountId", reason: "Unknown account." },
  ]);
  const send = vi.fn(() => Promise.reject(error));
  const { rerender } = render(<Harness send={send} error={null} />);

  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(send).toHaveBeenCalled());
  rerender(<Harness send={send} error={error} />);

  const line = await screen.findByLabelText("Second line");
  await waitFor(() => expect(line).toHaveAttribute("aria-invalid", "true"));
  expect(line).toHaveAttribute("aria-describedby", "line-1-error");
  expect(document.getElementById("line-1-error")).toHaveTextContent(
    "Line amount must be positive.",
  );
  expect(screen.getByLabelText("Amount")).toHaveAttribute("aria-invalid", "false");

  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("Unknown account.");
  expect(alert).not.toHaveTextContent("Line amount must be positive.");
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

  fireEvent.change(line, { target: { value: "3" } });

  await waitFor(() => expect(line).toHaveAttribute("aria-invalid", "false"));
  expect(document.getElementById("line-1-error")).toBeNull();
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
});

test("the bottom block disappears when every entry landed on a field", async () => {
  const error = problem([{ name: "amount", reason: "Too small." }]);
  const send = vi.fn(() => Promise.reject(error));
  const { rerender } = render(<Harness send={send} error={null} />);

  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(send).toHaveBeenCalled());
  rerender(<Harness send={send} error={error} />);

  expect(await screen.findByText("Too small.")).toHaveAttribute("id", "amount-error");
  expect(screen.queryByRole("alert")).toBeNull();
});

test("an error without field entries stays in the bottom block", async () => {
  const error = new ApiError({ status: 409, title: "Conflict", detail: "Already exists." });
  const send = vi.fn(() => Promise.reject(error));
  const { rerender } = render(<Harness send={send} error={null} />);

  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(send).toHaveBeenCalled());
  rerender(<Harness send={send} error={error} />);

  expect(screen.getByRole("alert")).toHaveTextContent("Already exists.");
  expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
});
