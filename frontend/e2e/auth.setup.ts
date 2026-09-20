import { test as setup } from "@playwright/test";
import { admin, expectSignedIn, fillSignIn, saveAdminState } from "./support";

setup("the administrator signs in once for the other specs", async ({ page }) => {
  await fillSignIn(page, admin.email, admin.password);
  await expectSignedIn(page);
  await saveAdminState(page.context());
});
