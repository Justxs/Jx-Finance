import { expect, setFeature, test } from "./support";

test("turning a feature off hides it and redirects its address until it is turned on again", async ({
  page,
}) => {
  try {
    await page.goto("/settings?section=features");
    const goals = page.getByRole("checkbox", { name: "Goals" });
    await expect(goals).toBeChecked();
    await goals.click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("You have unsaved changes.")).toBeHidden();

    await expect(page.getByRole("link", { name: "Goals" })).toHaveCount(0);
    await page.goto("/goals");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();

    await page.goto("/settings?section=features");
    await expect(goals).not.toBeChecked();
    await goals.click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("You have unsaved changes.")).toBeHidden();

    await expect(page.getByRole("link", { name: "Goals" }).first()).toBeVisible();
    await page.goto("/goals");
    await expect(page).toHaveURL(/\/goals$/);
    await expect(page.getByRole("heading", { level: 1, name: "Goals" })).toBeVisible();
  } finally {
    await setFeature(page.request, "goals", true);
  }
});
