import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { categories } from "@/storybook/fixtures";
import { createQueryWrapper } from "@/test/query";
import { CreateBudgetForm } from "./create-budget-form";

function problemResponse() {
  return new Response(
    JSON.stringify({
      title: "One or more validation errors occurred.",
      status: 400,
      errors: [{ name: "limitAmount", reason: "Limit must be greater than 0." }],
    }),
    { status: 400, headers: { "content-type": "application/problem+json" } },
  );
}

test("a 400 problem naming limitAmount lands under the limit input and clears on edit", async () => {
  const { Wrapper } = createQueryWrapper();
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(problemResponse())),
  );

  render(<CreateBudgetForm categories={categories} onCreated={vi.fn()} onCancel={vi.fn()} />, {
    wrapper: Wrapper,
  });

  const limit = screen.getByRole("textbox");
  fireEvent.change(limit, { target: { value: "250.00" } });
  fireEvent.click(screen.getByRole("button", { name: "Add budget" }));

  const message = await screen.findByText("Limit must be greater than 0.");
  expect(message).toHaveAttribute("id", "budget-limit-error");
  expect(limit).toHaveAttribute("aria-invalid", "true");
  expect(limit).toHaveAttribute("aria-describedby", "budget-limit-error");
  expect(screen.queryByRole("alert")).toBeNull();

  fireEvent.change(limit, { target: { value: "260.00" } });

  await waitFor(() => expect(limit).toHaveAttribute("aria-invalid", "false"));
  expect(screen.queryByText("Limit must be greater than 0.")).toBeNull();
});
