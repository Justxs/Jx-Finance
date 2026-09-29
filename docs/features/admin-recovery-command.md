# Administrator recovery command

Back to the [feature walkthrough](README.md). See also [architecture: Containers and the recovery command](../architecture/deployment.md).

```mermaid
flowchart TD
    Run["docker compose run --rm --no-deps -it api --recover-admin email"] --> Exists{"Existing administrator with that email?"}
    Exists -->|"no"| Stop["stops, creates nothing"]
    Exists -->|"yes"| Ask["interactive password entry, never a command-line argument"]
    Ask --> Reset["reset password, clear lockout end and counter"]
    Reset --> Tfa["disable 2FA, new authenticator key, recovery codes invalidated,<br/>every passkey of the administrator removed"]
    Tfa --> Sessions["sessions revoked, personal API tokens deleted"]
```

The console text says that the password, two-factor authentication and passkeys are reset and that sessions and API tokens are revoked. The steps after the password prompt live in `RecoveryCommand.RecoverAsync`, which the integration tests call directly because the command itself refuses to run without an interactive terminal. See [Passkeys](passkeys.md#resets-and-recovery).
