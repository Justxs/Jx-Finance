import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { fonts, setFont, setTextSize, textSizes } from "@/stores/theme-store";
import { FontPicker } from "./font-picker";

afterEach(() => {
  setFont("ledger");
  setTextSize("default");
});

function radio(value: string) {
  const found = screen.getAllByRole("radio").find((item) => item.getAttribute("value") === value);
  if (!found) {
    throw new Error(`no radio with the value ${value}`);
  }
  return found;
}

test("lists every typeface and text size with the current ones checked", () => {
  render(<FontPicker />);

  for (const group of screen.getAllByRole("radiogroup")) {
    expect(group).toHaveAccessibleName();
  }
  expect(screen.getAllByRole("radio")).toHaveLength(fonts.length + textSizes.length);
  expect(radio("ledger")).toBeChecked();
  expect(radio("default")).toBeChecked();
});

test("choosing a typeface and a size applies them to the document", async () => {
  render(<FontPicker />);

  await userEvent.click(radio("system"));
  await userEvent.click(radio("large"));

  expect(radio("system")).toBeChecked();
  expect(document.documentElement).toHaveAttribute("data-font", "system");
  expect(document.documentElement).toHaveAttribute("data-text-size", "large");
});
