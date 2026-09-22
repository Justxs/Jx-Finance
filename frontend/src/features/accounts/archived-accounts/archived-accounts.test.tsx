import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { archivedAccount, archivedAccounts, familyHousehold } from "@/storybook/fixtures";
import { renderWithQuery } from "@/test/query";
import { ArchivedAccountsList } from "./archived-accounts";

const householdNames = new Map([[familyHousehold.id, familyHousehold.name]]);

test("offers Restore only on the accounts the caller owns", () => {
  renderWithQuery(
    <ArchivedAccountsList
      accounts={archivedAccounts}
      householdNames={householdNames}
      restoringId={null}
      onRestore={vi.fn()}
    />,
  );

  expect(screen.getAllByRole("listitem")).toHaveLength(2);
  expect(screen.getByRole("button", { name: `Restore: ${archivedAccount.name}` })).toBeEnabled();
  expect(screen.getAllByRole("button", { name: /^Restore:/u })).toHaveLength(1);
  expect(screen.getByText("Only its owner can restore it")).toBeInTheDocument();
  expect(screen.getByText(new RegExp(familyHousehold.name, "u"))).toBeInTheDocument();
});

test("passes the account id to onRestore and locks the buttons while one restores", async () => {
  const onRestore = vi.fn();
  const { rerender } = renderWithQuery(
    <ArchivedAccountsList
      accounts={archivedAccounts}
      householdNames={householdNames}
      restoringId={null}
      onRestore={onRestore}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: `Restore: ${archivedAccount.name}` }));
  expect(onRestore).toHaveBeenCalledWith(archivedAccount.id);

  rerender(
    <ArchivedAccountsList
      accounts={archivedAccounts}
      householdNames={householdNames}
      restoringId={archivedAccount.id}
      onRestore={onRestore}
    />,
  );
  expect(screen.getByRole("button", { name: `Restore: ${archivedAccount.name}` })).toBeDisabled();
});
