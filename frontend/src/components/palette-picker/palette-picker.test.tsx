import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { palettes, setPalette } from "@/stores/theme-store";
import { PalettePicker } from "./palette-picker";

afterEach(() => {
  setPalette("ledger");
});

function radio(value: string) {
  const found = screen.getAllByRole("radio").find((item) => item.getAttribute("value") === value);
  if (!found) {
    throw new Error(`no radio with the value ${value}`);
  }
  return found;
}

test("lists every palette with the current one checked", () => {
  render(<PalettePicker />);

  expect(screen.getByRole("radiogroup")).toHaveAccessibleName();
  expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription();
  expect(screen.getAllByRole("radio")).toHaveLength(palettes.length);
  expect(screen.getByRole("radio", { checked: true })).toBe(radio("ledger"));
});

test("choosing a palette applies it to the document", async () => {
  render(<PalettePicker />);

  await userEvent.click(radio("plum"));

  expect(radio("plum")).toBeChecked();
  expect(document.documentElement).toHaveAttribute("data-palette", "plum");
});
