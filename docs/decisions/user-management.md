# User management: decisions

Related: feature page [User management](../features/user-management.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-19.** An administrator resets another user's password by typing a temporary one and confirming with their own password; other administrators can be reset, the caller cannot; no forced change at next sign-in
  - Rejected: A generated one-time link or code; limiting the reset to members; a `mustChangePassword` flag
  - Why: A link needs a delivery channel, which is what is deferred. Two administrators must be able to help each other, otherwise the second one needs shell access for `--recover-admin`; resetting yourself would skip the session renewal the profile does. A forced change is only worth having when it is complete: a column, a flag in the sign-in and profile responses, a server-side block of every route except profile and sign-out, and a dedicated screen in the client. Half of that (a flag the client may ignore) would promise more than it enforces, and in a household the administrator already has the database; the flow tells the user to change the password instead
- **2026-09-19.** Reactivating a user who is not deactivated does nothing and answers 204
  - Rejected: Answering 409; always clearing the lockout
  - Why: Repeating the call is harmless for a client that retries, and keeping it away from temporary lockouts leaves one way to lift those early, the password reset, which also proves who asked
