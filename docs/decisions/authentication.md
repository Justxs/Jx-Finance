# Authentication and sessions: decisions

Related: feature page [Sign-in, sessions and lockout](../features/sign-in-and-sessions.md); architecture [Authentication](../architecture/authentication.md).

## Current

Admin-created users; optional 2FA; absolute 1/30-day sessions; immediate stamp/deactivation validation; 15-minute lockout after five failed passwords or codes

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

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
