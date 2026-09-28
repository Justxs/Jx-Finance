# Plan: Passkeys

Status: planned 2026-09-28. Size M. Independent of the other plans. It adds to the same Security section of Settings as [Personal API tokens](personal-api-tokens.md), so whichever is built second puts its block under the other one.

## Outcome

- In Settings › Personal › Security, a member confirms their password and adds a passkey. It can be the phone's or the laptop's platform authenticator, a password manager, or a security key with a PIN.
- The list shows each passkey's name, when it was added, and whether it is synced or tied to one device. A passkey can be renamed or removed. A member has at most 10.
- The sign-in screen has "Sign in with a passkey". It asks for no email, no password and no authenticator code, and it lands in the application exactly as a password sign-in does.
- The authenticator-code step of a password sign-in offers "Use a passkey instead".
- A passkey still works while the password is temporarily locked out after five wrong attempts.
- An administrator's password reset with "Also reset two-factor authentication" removes the member's passkeys too, and so does `--recover-admin`.
- An installation opened over plain HTTP from another machine, or by an IP address, does not offer passkeys, and the Security section says why.

## Today

- Identity is `AddIdentityCore<AppUser>` with roles and EF stores, and `AppDbContext` is an `IdentityDbContext<AppUser, AppRole, Guid>`. There is no `SignInManager` and no Identity cookie scheme.
- A sign-in ends in `ISessionService.SignInAsync`, which writes the `UserSessions` row and the `jx_access` and `jx_refresh` cookies.
- The second step is TOTP only: `LoginRequest.TwoFactorCode` goes to `AuthService.ConsumeTwoFactorCodeAsync`, which also accepts a recovery code. Every secret check goes through `AuthService.AttemptAsync` and its lockout.
- `Microsoft.AspNetCore.Identity.EntityFrameworkCore` 10.0.12 is referenced, and it already contains the .NET 10 passkey support. The Identity store schema is still version 2, so there is no `AspNetUserPasskeys` table.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Library | The .NET 10 passkey support in ASP.NET Core Identity. The app calls `IPasskeyHandler<AppUser>` for the WebAuthn ceremonies and the `UserManager<AppUser>` passkey methods (`AddOrUpdatePasskeyAsync`, `GetPasskeysAsync`, `RemovePasskeyAsync`) for storage | Fido2NetLib (`passwordless-lib/fido2-net-lib`); the `SignInManager` passkey methods (`MakePasskeyCreationOptionsAsync`, `PasskeySignInAsync`) | Identity already owns the users, the lockout, the security stamp and the stores. The built-in support needs no new package and stores credentials in `AspNetUserPasskeys`, which backups carry with no code. `SignInManager` keeps the ceremony state in, and signs in through, Identity's own cookie schemes, which this app does not use. Fido2NetLib would add a dependency and a credential table of its own. Its main extra, attestation checks against the FIDO metadata service, is not something a household needs |
| Ceremony state | The app keeps the handler's attestation state and assertion state itself. They go in a cookie `jx_passkey` that is protected with ASP.NET Core Data Protection (purpose `JxFinance.Passkeys.State.v1`): HttpOnly, SameSite=Strict, path `/api/auth/passkeys`, a five-minute lifetime, and deleted as soon as it is read. The cookie records the kind (registration or sign-in). For a registration it also records the user id and the session id, and the finish step compares both | A server-side table; returning the state to the browser in the response body | These are the three requirements the Identity documentation sets for calling the handler directly: integrity, binding to the requesting session, and single use. They are met with no table and no clean-up job. A state the client can edit would let it register a key on someone else's account |
| Browser API | `navigator.credentials.create()` and `get()` with `PublicKeyCredential.parseCreationOptionsFromJSON`, `parseRequestOptionsFromJSON` and `credential.toJSON()`, wrapped in one small `src/lib/passkeys.ts` | `@simplewebauthn/browser`; `@github/webauthn-json` | The JSON helpers are in Chrome and Edge 129, Firefox 119 and Safari 18.4. Identity already speaks the WebAuthn JSON forms, so there is no base64url conversion to write and no package to keep current. A browser without the helpers simply shows no passkey button |
| What a passkey proves | A passkey sign-in is a whole sign-in. Credentials are discoverable (`ResidentKeyRequirement` required) and user verification is required, so a PIN or biometric is always checked. It replaces the password and the authenticator code | Passkeys as a second step after the password only | A user-verified passkey is possession plus PIN or biometric, which is already two factors. The "Use a passkey instead" button on the code step runs the same sign-in, so the second-factor case needs no second kind of ceremony |
| The password stays | Every account keeps its password in v1 | Passkey-only accounts that remove the password | Several things confirm a password today: restore, two-factor setup and disable, the own password change, the administrator's reset and every `ReauthenticateAsync` caller. Confirming those with a passkey instead is a later step |
| TOTP and recovery codes | Unchanged and independent. Recovery codes stay the fallback for the authenticator. Passkeys get no recovery codes of their own: the fallback is the password, with the code when two-step is on, and after that an administrator's reset | Recovery codes per passkey; requiring TOTP before a passkey can be added | Each factor keeps the recovery path it already has, and nothing new has to be printed and kept |
| Relying party id | `IdentityPasskeyOptions.ServerDomain` is the host of `App:SiteUrl` when it is set (the production overlay sets `https://${SITE_ADDRESS}`). `ValidateOrigin` accepts exactly that origin. In development it is left unset, so the host header gives `localhost` | Inferring it from the host header in production | The Identity documentation warns against trusting the host header. `AllowedHosts` limits that header already, but a fixed id makes one consequence explicit: changing `SITE_ADDRESS` orphans every passkey, and the deployment page says so |
| HTTPS | WebAuthn needs a secure context, and `localhost` is one. `GET /api/settings/public` gains `passkeysAvailable`. It is false when `App:SiteUrl` is set and its host is an IP address or its scheme is `http`. The client also checks `window.isSecureContext` and the JSON helpers | Offering the button and letting the browser fail | The production overlay serves Caddy's internal TLS, and the deployment page already asks for its root certificate to be trusted on each device. An address that cannot work is better explained once than attempted |
| Lockout | A failed assertion never calls `AccessFailedAsync`. A temporarily locked-out user may still sign in with a passkey, and success resets the failed-attempt counter as every completed sign-in does. A deactivated user gets `credentials.invalid`. Both sign-in endpoints are throttled to 10 calls per five minutes per client | Counting failed assertions toward the lockout | A failed assertion is not a guess at a secret. Counting it would let anyone who holds a credential id lock its owner out, which is the objection that already stopped a lockout from ending sessions. The lockout exists to slow password guessing, and a passkey sign-in is not that |
| Sessions on change | Adding or removing a passkey leaves the security stamp alone. After a removal the section suggests "Sign out everywhere else" | `RenewAsync` on every change, as two-factor changes do | A passkey list change does not change what an open session may do. Ending every other browser when you add a key to your phone would be a surprise |
| Limits | At most 10 passkeys per user, names at most 100 characters, attestation `none` | Unlimited | This is the resource-limit advice in the Identity documentation, and the list stays readable |
| Autofill in the email field | Not in v1 | `mediation: "conditional"` | Conditional mediation has to start when the sign-in page mounts and be aborted when the password form is submitted, which needs an effect. The button covers the need |
| Administrator reset | `resetTwoFactor` also removes every passkey of the target, and so does `RecoveryCommand` | A separate `resetPasskeys` flag | A lost phone takes the authenticator app and the passkey with it. One reset of the strong factors is what that case needs |

## Data model

| Change | Detail |
| --- | --- |
| Identity schema version 3 | `options.Stores.SchemaVersion = IdentitySchemaVersions.Version3` in `AddIdentityCore`. This adds the `AspNetUserPasskeys` table: the credential id as key, `UserId` with a cascading foreign key, and the stored passkey data (public key, sign count, name, flags, transports and creation time) |
| `AppUser` | None |

Migration: `AddPasskeys`. Check that it creates only the passkey table. Backups carry the table like the password hashes and two-factor secrets, and a restored passkey works only under the same relying party id.

## Backend steps

1. **Identity.** In `Infrastructure/DependencyInjection.AddInfrastructure`:
   - set the schema version;
   - register `IPasskeyHandler<AppUser>` with Identity's default `PasskeyHandler<AppUser>`. `AddIdentityCore` does not register it, and `AddSignInManager` would bring the cookie schemes that are not wanted;
   - configure `IdentityPasskeyOptions` from `AppOptions.SiteUrl`: `ServerDomain`, `ValidateOrigin`, user verification and resident key both required, and a two-minute `AuthenticatorTimeout`.

   Then run `just migrate-add AddPasskeys`.
2. **State cookie.** `Infrastructure/Auth/PasskeyStateCookie`:
   - protects and reads a `PasskeyState(Kind, State, UserId?, SessionId?, ExpiresAt)`;
   - uses the same Secure rule as the session cookies, with the cookie options moved from the private `SessionService.CookieOptions` into `AuthCookies`;
   - declares `PrintMembers` so `State` prints as `SecretText.Hidden`.
3. **Service.** `IPasskeyService` and `PasskeyService` in `Endpoints/Auth/Services`.
   - **Begin registration:**
     - `IAuthService.ReauthenticateAsync(password, ErrorCodes.PasswordIncorrect, …)`, which counts toward the lockout;
     - at most 10 passkeys (`passkey.limitReached`, 409);
     - `MakeCreationOptionsAsync` for a `PasskeyUserEntity` of id, email and display name;
     - write the state cookie and return the options JSON as a string.
   - **Finish registration:**
     - read and delete the cookie; refuse a missing, expired or wrong-kind state, or one for another user or session (`passkey.stateInvalid`);
     - `PerformAttestationAsync`, where a failure is `passkey.invalid`;
     - check that the result names the signed-in user;
     - set the name, which defaults to the browser label the client sends;
     - `AddOrUpdatePasskeyAsync`.
   - **List, rename and remove** through the `UserManager` methods. The id is the base64url credential id. The owner's own list is the only lookup, so an unknown id answers 404.
   - **Begin sign-in:** `MakeRequestOptionsAsync` with no user (discoverable), then write the state cookie.
   - **Finish sign-in:**
     - read and delete the cookie, then `PerformAssertionAsync`;
     - refuse a user who is deactivated or has not finished setup (`credentials.invalid`);
     - store the updated sign count with `AddOrUpdatePasskeyAsync`;
     - reset the failed-attempt counter, then `ISessionService.SignInAsync(user, rememberMe)`;
     - answer the same `LoginResponse` as password sign-in.
4. **Endpoints** in `Endpoints/Auth/Passkeys`, under `AuthGroup`:
   - `POST /api/auth/passkeys/registration-options` with `{ password }` (`ReauthenticateRequest`), throttled to 5 per five minutes;
   - `POST /api/auth/passkeys` with `{ credentialJson, name }`, which answers 201;
   - `GET /api/auth/passkeys`;
   - `PUT /api/auth/passkeys/{id}` with `{ name }`;
   - `DELETE /api/auth/passkeys/{id}`;
   - `POST /api/auth/passkeys/sign-in-options` and `POST /api/auth/passkeys/sign-in` with `{ credentialJson, rememberMe }`, both anonymous and throttled to 10 per five minutes. Add them to the anonymous list in `AuthorizationTests`.
5. **Resets.** `UserService.ResetPasswordAsync` removes the target's passkeys inside its transaction when `ResetTwoFactor` is set. `RecoveryCommand.RunAsync` removes the administrator's passkeys. Both summaries and the command's console text say so.
6. **Public settings.** `passkeysAvailable` on the public settings response.
7. **Logging.** Credential JSON is never logged. Request records that carry it print it as `SecretText.Hidden`, and `SecretRedactionTests` gets `Credential` added to its pattern.
8. **Error codes:** `passkey.invalid` (401 on sign-in, 400 on registration), `passkey.stateInvalid` ("That took too long. Try again."), `passkey.limitReached` and `passkey.unavailable`.

## Frontend steps

1. `just gen`. The create, rename and remove mutations invalidate `/api/auth/passkeys`. The two options calls and the sign-in go into `mutationsWithoutInvalidation`, as login does.
2. **Browser helper.** `src/lib/passkeys.ts` provides `passkeysSupported()`, `createPasskey(optionsJson)` and `getPasskey(optionsJson)`, which return `JSON.stringify(credential.toJSON())`. `NotAllowedError` (cancelled or timed out) is a quiet cancel, and `InvalidStateError` (already registered on this authenticator) gets its own text. A unit test uses a fake `navigator.credentials`.
3. **Security section.** `features/profile/passkeys-section`, rendered under `TwoFactorSettings` in the `security` section of `profile-page.tsx`:
   - the list, where the synced or device-bound flag is carried by text, not colour;
   - "Add a passkey" behind the same password prompt `two-factor-settings.tsx` uses. `PasswordPrompt` moves to its own file so both can use it;
   - the name prefilled from `describeUserAgent`;
   - rename through `EditModal`, remove through `useConfirmedDelete` and `ConfirmDeleteDialog`;
   - the sentence for an unavailable installation or browser.

   Stories: empty, a list, pending, unsupported, a server error, and a `play` that adds one with the helper stubbed.
4. **Sign-in page.** `login-page.tsx` gets an outline "Sign in with a passkey" button under the form while `passkeysAvailable` and the browser allow it. The two-factor step gets "Use a passkey instead". Both go on through `loadAppShell` exactly as a password sign-in does. The form's `rememberMe` value is sent along.
5. **Users.** The reset dialog's checkbox reads "Also reset two-factor authentication and passkeys".
6. **Locales.** English and Lithuanian for every text and the four error codes.

## Tests

- **Unit:**
  - `PasskeyStateCookie`: a round trip; a tampered value, another purpose and an expired state are all refused.
  - `passkeys.ts`: its error mapping.
  - `SecretRedactionTests`: the new records.
- **Integration**, with a small software authenticator in `JxFinance.Tests/Support`: an ES256 key made in the test that builds `clientDataJSON` and the authenticator data and signs them.
  - Registration: a wrong password answers `password.incorrect` and counts toward the lockout; finishing without a state, with a state from another session, or after five minutes answers `passkey.stateInvalid`; the eleventh passkey answers 409.
  - Sign-in: it sets both cookies and a `UserSessions` row, and asks no code for a TOTP user; a wrong origin and a wrong relying party id are refused; a bad signature answers `passkey.invalid` and does not move `AccessFailedCount`.
  - Lockout and deactivation: a locked-out user signs in and the counter resets; a deactivated user gets `credentials.invalid`.
  - Resets and backup: the sign count is stored after each sign-in; an administrator reset with `resetTwoFactor` and the recovery command remove the passkeys; a backup restore keeps them.
- **End to end:** one spec in `frontend/e2e` that adds a passkey and signs in with it, using Chromium's virtual authenticator (CDP `WebAuthn.enable` and `WebAuthn.addVirtualAuthenticator`), run through `just e2e`.

## Docs

- New `docs/features/passkeys.md`, and a row in `docs/features/README.md`. The page covers registration, sign-in, lockout, resets, the relying party id and HTTPS, and a sequence diagram of the state cookie.
- Updates to:
  - `docs/features/sign-in-and-sessions.md`: the sign-in diagram gains the passkey branch;
  - `docs/features/two-factor-authentication.md`: how passkeys relate to the code step;
  - `docs/architecture/authentication.md`: the state cookie, and why `SignInManager` is not used;
  - `docs/decisions/authentication.md`: the entries above, dated, and the Current line;
  - `docs/architecture/deployment.md`: `SITE_ADDRESS` fixes the relying party id, and changing it orphans every passkey;
  - `docs/features/user-management.md` and `docs/features/admin-recovery-command.md`: the resets;
  - `docs/features/backup-and-restore.md`: passkeys travel, and work only under the same relying party id;
  - `docs/api.md`, `docs/data-model.md`, `docs/scope.md` and `docs/backlog.md`.

## Open questions

- A member with the authenticator switched on can sign in with a passkey alone. Is that acceptable, or should such accounts still be asked for the code after a passkey? This plan says a user-verified passkey is enough.
- Does any installation need to be reached under two names, for example a LAN name and a VPN name? A relying party id serves one domain. Serving both needs WebAuthn related origins, which are not planned here.
