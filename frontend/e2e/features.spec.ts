import { expect, setFeature, test } from "./support";

test("turning a feature off hides it and redirects its address until it is turned on again", async ({
  page,
}) => {
  const planTabs = page.getByRole("navigation", { name: "Plan" });
  const dashboard = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Dashboard" });

  try {
    await page.goto("/settings?section=features");
    const goals = page.getByRole("checkbox", { name: "Goals" });
    await expect(goals).toBeChecked();
    await goals.click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("You have unsaved changes.")).toBeHidden();

    await page.goto("/budgets");
    await expect(planTabs.getByRole("link", { name: "Budgets" })).toBeVisible();
    await expect(planTabs.getByRole("link", { name: "Goals" })).toHaveCount(0);
    await page.goto("/goals");
    await expect(page).toHaveURL(/\/$/);
    await expect(dashboard).toHaveAttribute("aria-current", "page");

    await page.goto("/settings?section=features");
    await expect(goals).not.toBeChecked();
    await goals.click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("You have unsaved changes.")).toBeHidden();

    await page.goto("/goals");
    await expect(page).toHaveURL(/\/goals$/);
    await expect(planTabs.getByRole("link", { name: "Goals" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  } finally {
    await setFeature(page.request, "goals", true);
  }
});
