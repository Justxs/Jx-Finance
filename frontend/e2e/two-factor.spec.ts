import type { Browser, Page, TestInfo } from "@playwright/test";
import { Secret, TOTP } from "otpauth";
import { EnableTwoFactorResponse } from "../src/api/schemas/index.zod";
import {
  createMember,
  expect,
  expectSignedIn,
  fillSignIn,
  newVisitor,
  signIn,
  test,
  uniqueEmail,
} from "./support";

const password = "Totp-Member-Password-123!";

async function signedInMember(admin: Page, browser: Browser, testInfo: TestInfo) {
  const email = uniqueEmail("totp");
  await createMember(admin.request, email, password);
  const member = await newVisitor(browser, testInfo, "member");
  await signIn(member, email, password);
  return { email, member };
}

async function enrol(member: Page) {
  await member.goto("/profile?section=security");
  await member.getByLabel("Current password").fill(password);
  await member.getByRole("button", { name: "Enable two-factor authentication" }).click();
  await expect(member.getByAltText("Authenticator QR code")).toBeVisible();
  const sharedKey = (await member.locator("p.font-mono").innerText()).replaceAll(/\s/g, "");
  const totp = new TOTP({ secret: Secret.fromBase32(sharedKey.toUpperCase()) });

  const enabled = member.waitForResponse((response) =>
    response.url().endsWith("/api/auth/2fa/enable"),
  );
  await member.getByLabel("Enter the 6-digit code").fill(totp.generate());
  await member.getByRole("button", { name: "Confirm and enable" }).click();
  const response = await enabled;
  expect(response.status()).toBe(200);
  const { recoveryCodes } = EnableTwoFactorResponse.parse(await response.json());
  expect(recoveryCodes.length).toBeGreaterThan(1);
  return { totp, recoveryCodes };
}

test("a member enrols in two-factor authentication and signs in with a code and a recovery code", async ({
  page,
  browser,
}, testInfo) => {
  const { email, member } = await signedInMember(page, browser, testInfo);
  const { totp, recoveryCodes } = await enrol(member);

  await member.context().clearCookies();
  await fillSignIn(member, email, password);
  await member.getByLabel("Authenticator code").fill("000000");
  await member.getByRole("button", { name: "Verify code" }).click();
  await expect(member.getByText("The code is not valid.")).toBeVisible();
  await member.getByLabel("Authenticator code").fill(totp.generate());
  await member.getByRole("button", { name: "Verify code" }).click();
  await expectSignedIn(member);
  await member.goto("/profile?section=security");
  await expect(
    member.getByText("Two-factor authentication is currently enabled for your account."),
  ).toBeVisible();

  await member.getByRole("button", { name: "Log out" }).click();
  await expect(member).toHaveURL(/\/login/);

  await fillSignIn(member, email, password);
  await member.getByLabel("Authenticator code").fill(recoveryCodes[0] ?? "");
  await member.getByRole("button", { name: "Verify code" }).click();
  await expectSignedIn(member);

  await member.context().close();
});

test("enabling two-factor authentication keeps the member signed in to read the recovery codes", async ({
  page,
  browser,
}, testInfo) => {
  const { member } = await signedInMember(page, browser, testInfo);
  await enrol(member);

  await expect(member.getByRole("heading", { name: "Save your recovery codes" })).toBeVisible();
  await member.waitForLoadState("networkidle");
  await expect(member).toHaveURL(/\/profile/);
  await member.getByRole("button", { name: "I've saved these codes" }).click({ timeout: 10_000 });
  await expect(
    member.getByText("Two-factor authentication is currently enabled for your account."),
  ).toBeVisible();

  await member.context().close();
});
