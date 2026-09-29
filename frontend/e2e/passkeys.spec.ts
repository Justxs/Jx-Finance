import type { Page } from "@playwright/test";
import {
  createMember,
  expect,
  expectSignedIn,
  newVisitor,
  signIn,
  test,
  uniqueEmail,
} from "./support";

const password = "Passkey-Member-Password-123!";

async function addVirtualAuthenticator(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

test("a member adds a passkey and signs in with it alone", async ({ page, browser }, testInfo) => {
  const email = uniqueEmail("passkey");
  await createMember(page.request, email, password);
  const member = await newVisitor(browser, testInfo, "member");
  await addVirtualAuthenticator(member);
  await signIn(member, email, password);

  await member.goto("/profile?section=security");
  const passkeys = member.getByRole("region", { name: "Passkeys" });
  await expect(passkeys.getByText("No passkeys yet.")).toBeVisible();
  await passkeys.getByLabel("Current password").fill(password);
  await passkeys.getByRole("button", { name: "Add a passkey" }).click();
  await expect(member.getByText("Passkey added")).toBeVisible();
  await expect(passkeys.getByText("This device only")).toBeVisible();

  await member.context().clearCookies();
  await member.goto("/login");
  await member.getByRole("button", { name: "Sign in with a passkey" }).click();
  await expectSignedIn(member);

  await member.context().close();
});
