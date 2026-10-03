import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { Label } from "@/components/ui/label/label";
import { TooltipProvider } from "@/components/ui/tooltip/tooltip";
import { IconPicker } from "./icon-picker";

const LABEL_ID = "icon-label";

function Picker({
  initial,
  onChange,
}: Readonly<{ initial: string | null; onChange: (icon: string | null) => void }>) {
  const [value, setValue] = useState(initial);

  function change(icon: string | null) {
    setValue(icon);
    onChange(icon);
  }

  return (
    <TooltipProvider>
      <Label id={LABEL_ID}>Icon</Label>
      <IconPicker aria-labelledby={LABEL_ID} value={value} onChange={change} />
    </TooltipProvider>
  );
}

function renderPicker(initial: string | null) {
  const onChange = vi.fn();
  render(<Picker initial={initial} onChange={onChange} />);
  return onChange;
}

test("choosing an icon reports its Lucide name and names it above the tiles", async () => {
  const onChange = renderPicker(null);

  await userEvent.click(screen.getByRole("radio", { name: "Shopping bag" }));

  expect(onChange).toHaveBeenLastCalledWith("shopping-bag");
  expect(screen.getByRole("radio", { name: "Shopping bag" })).toBeChecked();
  expect(screen.getByText("Selected: Shopping bag")).toBeInTheDocument();
});

test("the No icon tile clears the choice to null", async () => {
  const onChange = renderPicker("coffee");

  await userEvent.click(screen.getByRole("radio", { name: "No icon" }));

  expect(onChange).toHaveBeenLastCalledWith(null);
  expect(screen.getByText("No icon selected")).toBeInTheDocument();
});

test("clicking the chosen icon again keeps it", async () => {
  const onChange = renderPicker("coffee");

  await userEvent.click(screen.getByRole("radio", { name: "Coffee" }));

  expect(onChange).not.toHaveBeenCalledWith(null);
  expect(screen.getByRole("radio", { name: "Coffee" })).toBeChecked();
});

test("the picker is one tab stop on the chosen tile and the arrow keys choose", async () => {
  const onChange = renderPicker("coffee");
  expect(screen.getByRole("radiogroup", { name: "Icon" })).toBeInTheDocument();
  const radios = screen.getAllByRole("radio");
  expect(radios.filter((radio) => radio.tabIndex === 0)).toEqual([
    screen.getByRole("radio", { name: "Coffee" }),
  ]);

  await userEvent.tab();
  expect(screen.getByRole("radio", { name: "Coffee" })).toHaveFocus();

  await userEvent.keyboard("{ArrowRight}");
  const next = radios[radios.indexOf(screen.getByRole("radio", { name: "Coffee" })) + 1]!;
  expect(next).toHaveFocus();
  expect(next).toBeChecked();
  expect(onChange).toHaveBeenCalledOnce();
});
