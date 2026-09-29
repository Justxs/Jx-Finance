# Authentication and sessions: decisions

Related: feature pages [Sign-in, sessions and lockout](../features/sign-in-and-sessions.md) and [Passkeys](../features/passkeys.md); architecture [Authentication](../architecture/authentication.md).

## Current

Admin-created users; optional 2FA; optional passkeys through ASP.NET Core Identity, each a whole sign-in that never counts toward the lockout; absolute 1/30-day sessions; immediate stamp/deactivation validation; 15-minute lockout after five failed passwords or codes

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-29.** A member who has the authenticator app switched on signs in with a passkey alone and is not asked for the code after it. Decided while the owner was away, as the plan recommended; review it
  - Rejected: Asking a two-factor member for the authenticator code after a passkey
  - Why: Registration and sign-in require user verification, so a passkey is possession of the authenticator plus its PIN or biometric, which is already two factors. Asking for a code as well would make the passkey slower than the password it replaces, and "Use a passkey instead" on the code step would need a second kind of ceremony
- **2026-09-29.** One relying party name per installation, fixed by `App:SiteUrl`. Decided while the owner was away as the plan's conservative default; review it if an installation is reached under two names, for example a LAN name and a VPN name
  - Rejected: WebAuthn related origins (`/.well-known/webauthn`) for a second name
  - Why: No installation is known to need two names, and every accepted origin is one more place a ceremony can come from. Adding them later changes no stored passkey
- **2026-09-29.** Passkeys use the passkey support in ASP.NET Core Identity 10: `IPasskeyHandler<AppUser>` for the ceremonies and the `UserManager` passkey methods for storage in `AspNetUserPasskeys`
  - Rejected: Fido2NetLib; the `SignInManager` passkey methods
  - Why: Identity already owns the users, the lockout, the security stamp and the stores, needs no new package, and backups carry its table with no code. `SignInManager` keeps the ceremony state in, and signs in through, Identity's cookie schemes, which this application does not use. Fido2NetLib would add a dependency and a table of its own; its main extra, attestation checks against the FIDO metadata service, is not something a household needs
- **2026-09-29.** The ceremony state lives in `jx_passkey`, protected with Data Protection (purpose `JxFinance.Passkeys.State.v1`), HttpOnly, SameSite=Strict, path `/api/auth/passkeys`, five minutes, deleted when read; a registration state also names the user and the session
  - Rejected: A server-side table; returning the state to the browser in the response body
  - Why: These are the three requirements Identity sets for calling the handler directly (integrity, binding to the requesting session, single use), met with no table and no clean-up job. A state the client could edit would let it register a key on someone else's account
- **2026-09-29.** The browser side is `navigator.credentials` with `PublicKeyCredential.parseCreationOptionsFromJSON`, `parseRequestOptionsFromJSON` and `toJSON()`, in `src/lib/passkeys.ts`
  - Rejected: `@simplewebauthn/browser`; `@github/webauthn-json`
  - Why: The helpers are in Chrome and Edge 129, Firefox 119 and Safari 18.4, and Identity speaks the same JSON, so there is no base64url code to write and no package to keep current. A browser without them shows no passkey button
- **2026-09-29.** Every account keeps its password; passkeys get no recovery codes; the authenticator and its recovery codes are unchanged and independent
  - Rejected: Passkey-only accounts; recovery codes per passkey; requiring the authenticator before a passkey can be added
  - Why: Restore, two-factor setup and disable, the own password change, the administrator's reset and every `ReauthenticateAsync` caller confirm a password today. Each factor keeps the recovery path it has, and nothing new has to be printed and kept
- **2026-09-29.** A failed assertion never counts toward the lockout, a temporarily locked-out member may still sign in with a passkey, and a completed passkey sign-in resets the counter; both anonymous passkey endpoints are throttled to 10 calls per five minutes per client
  - Rejected: Counting failed assertions toward the lockout
  - Why: A failed assertion is not a guess at a secret. Counting it would let anyone who holds a credential id lock its owner out, the same objection that keeps a lockout from ending sessions
- **2026-09-29.** The relying party id is the host of `App:SiteUrl` and `ValidateOrigin` accepts exactly its origin; without `App:SiteUrl` (development, the end-to-end stack) the host header decides. `passkeysAvailable` is false for a site address that is plain HTTP or an IP address, and the client also checks `isSecureContext`
  - Rejected: Trusting the host header in production; offering the button and letting the browser fail
  - Why: Identity's documentation warns against the host header, and a fixed id makes the consequence explicit: changing `SITE_ADDRESS` orphans every passkey. An address that cannot work is better explained once than attempted
- **2026-09-29.** Adding or removing a passkey leaves the security stamp alone; after a removal the section suggests signing out everywhere else
  - Rejected: `RenewAsync` on every change, as two-factor changes do
  - Why: The passkey list does not change what an open session may do, and ending every other browser when a key is added to a phone would be a surprise
- **2026-09-29.** At most 10 passkeys per member, names of at most 100 characters, attestation `none`, no autofill in the email field
  - Rejected: Unlimited passkeys; `mediation: "conditional"` autofill
  - Why: The limit follows Identity's resource-limit advice and keeps the list readable. Conditional mediation has to start when the sign-in page mounts and be aborted when the password form is submitted, which needs an effect; the button covers the need
- **2026-09-29.** The administrator's `resetTwoFactor` and `--recover-admin` also remove every passkey of the target
  - Rejected: A separate `resetPasskeys` flag
  - Why: A lost phone takes the authenticator app and the passkey with it; one reset of the strong factors is what that case needs
- **2026-09-28.** The per-request session lookup in `JwtCookieAuthentication` runs with `CancellationToken.None`, not `RequestAborted`, so a browser that drops a request mid-authentication no longer produces an Error log from `JwtBearerHandler` and a failed Npgsql `CONNECT` span
  - Rejected: A Serilog filter for `OperationCanceledException` from `JwtBearerHandler`, which hides the log but leaves the failed span in the trace
  - Rejected: An OpenTelemetry processor that clears the error status of cancelled Npgsql spans, which is more code and cannot remove the recorded exception event
  - Rejected: Turning off Npgsql's physical-open tracing, which would also hide real connection failures
- **2026-09-20.** Every authenticated request checks that its `UserSessions` row still exists, so revoking a browser takes effect at once
  - Rejected: Leaving the access token valid for up to 10 minutes after the row is deleted and documenting the tail
  - Why: The handler already loads the user per request, so one more lookup by primary key costs little, and a "Sign out" button that leaves the other browser working for ten minutes would not do what it says. Sign out and restore gain the same immediacy
- **2026-09-20.** Deleting the current session through `DELETE /api/auth/sessions/{id}` answers 403 `session.current`
  - Rejected: Allowing it and clearing the cookies; answering 400 or 409
  - Why: It mirrors `user.selfChange`: a valid request that the caller may not apply to themselves. Sign out already ends the current session and clears its cookies
- **2026-09-20.** The browser label comes from a small pure function, `describeUserAgent` in `src/lib/user-agent.ts`
  - Rejected: Adding `ua-parser-js` or `bowser`
  - Why: The list needs a browser family, a major version and an operating system for a handful of browsers; a package of device tables is not worth its size for that
- **2026-09-19.** Five failed passwords or codes lock the account for 15 minutes (ASP.NET Identity lockout) and answer 429 `credentials.lockedOut`; the lockout blocks only secret verification, not sessions that are already open
  - Rejected: Letting the lockout also end open sessions, as deactivation does; answering a locked account with `credentials.invalid`; throttling per client only
  - Why: Ending sessions would let anyone who knows an email address sign its owner out at will. A distinct code tells the owner why the right password fails; it also tells an attacker that the address exists, which was accepted because users are created by an administrator and addresses are not secret within a household. The per-client throttle alone is bypassed by changing address
- **2026-09-19.** A refresh with the previous token within 30 seconds of the rotation answers 204 with a new access cookie only; after 30 seconds it deletes the session
  - Rejected: Answering 204 with no cookie at all; rotating again for the second tab; keeping strict single-use tokens
  - Why: With no cookie the losing tab can retry before the winning response has stored its cookies and fails; a second rotation makes the two tabs overwrite each other's refresh cookie; strict single use signed users with two tabs out. The cost is that a stolen previous token is worth one 10-minute access token during those 30 seconds
