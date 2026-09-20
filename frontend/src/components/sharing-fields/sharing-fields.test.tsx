import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import type { HouseholdResponse, Scope } from "@/api/generated/model";
import { useAppForm } from "@/components/form";
import { SharingFields } from "./sharing-fields";

const household: HouseholdResponse = { id: "h1", name: "Family", myRole: "owner", members: [] };

interface Values {
  scope: Scope;
  householdId: string;
}

function Harness() {
  const defaultValues: Values = { scope: "personal", householdId: "" };
  const form = useAppForm({ defaultValues });

  return (
    <SharingFields
      form={form}
      fields={{ scope: "scope", householdId: "householdId" }}
      idPrefix="thing"
      households={[household]}
    />
  );
}

test("asks for a household only when the scope is shared", async () => {
  render(<Harness />);

  expect(screen.getByRole("combobox", { name: "Visibility" })).toHaveAttribute("id", "thing-scope");
  expect(screen.queryByRole("combobox", { name: "Household" })).not.toBeInTheDocument();

  await userEvent.click(screen.getByRole("combobox", { name: "Visibility" }));
  await userEvent.click(await screen.findByRole("option", { name: "Shared" }));

  expect(await screen.findByRole("combobox", { name: "Household" })).toHaveAttribute(
    "id",
    "thing-household",
  );
});
