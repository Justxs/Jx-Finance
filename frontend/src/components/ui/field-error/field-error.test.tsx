import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { FieldError } from "./field-error";

test("renders nothing without a message", () => {
  const { container } = render(<FieldError id="amount-error" />);

  expect(container).toBeEmptyDOMElement();
});

test("renders the message under the id fields point at", () => {
  render(<FieldError id="amount-error" message="Amount is required." />);

  expect(screen.getByText("Amount is required.")).toHaveAttribute("id", "amount-error");
});
