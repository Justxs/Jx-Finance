import { test as setup } from "@playwright/test";
import { saveAdminState, signIn } from "./support";

setup("the administrator signs in once for the other specs", async ({ page }) => {
  await signIn(page);
  await saveAdminState(page.context());
});
