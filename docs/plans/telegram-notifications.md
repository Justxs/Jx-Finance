# Plan: Telegram notifications

Status: planned 2026-10-03. Size M. Builds on [Discord notifications](../features/discord-notifications.md) as it stands since the installation-channel change of 2026-10-03, and copies its shape: one channel for the whole installation, members only tick kinds. Nothing must ship first.

## Outcome

- An administrator creates a bot with @BotFather, adds it to a Telegram group, and pastes the bot token and the group's chat id into Settings › Installation › Notification providers › Telegram, a third tab beside Email and Discord. They switch Telegram on and can send a test message, even while it is off.
- Each member gets a Telegram column in the table in Settings › Personal › Notifications. From then on every notification of a ticked kind is also posted to the group, starting with the member's display name, in the member's language, with a link to the page when `App:SiteUrl` is set.
- Telegram is a setting, not a feature switch, and is off by default. Turning it off stops every post and keeps the token, the chat id and every member's ticked kinds.
- The bot never reads the group. The server only ever calls `sendMessage` on `api.telegram.org`. There is no webhook, no `getUpdates` poll, and no inbound traffic.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Delivery target | One group chat for the installation, set by an administrator, and each message names the member (owner's choice, 2026-10-03) | A private chat per member, linked through a `t.me/<bot>?start=<code>` deep link and a `getUpdates` poll; both a group and private chats | It matches Discord, so members learn one model. It needs no inbound traffic, no link codes, no polling job and no per-user chat column. Private chats would be the first thing the server reads from an outside service |
| Outbox | A `TelegramMessages` table of its own, a copy of `DiscordMessages` | One `ChatMessages` table with a channel column, which would migrate `DiscordMessages` into it | Email and Discord each have their own table. Each channel has its own lock, batch size, rate limit and content format, and the publisher's dedupe preload stays a simple query per table |
| Drain | Extract the shared part of `DiscordOutboxJob` (prune, claim under a lock, load the members' kinds, send in order, save the outcomes with the concurrency retry) into an abstract `ChatOutboxJob<TMessage>`. `DiscordOutboxJob` and `TelegramOutboxJob` supply the table, the lock, the settings fields and the send | Copying the 210-line job | Two users now, and the claim, ordering and concurrency handling are the parts most easily copied wrong. `DiscordNotificationTests` is the safety net for the refactor |
| Text format | `parse_mode: "HTML"`: the member name and title in `<b>`, everything else escaped by `TelegramText.Escape` (`&`, `<`, `>`), plus U+2060 WORD JOINER after every `@` so a name or payee can never mention anyone | MarkdownV2; plain text | HTML needs three escapes, where MarkdownV2 needs eighteen and rejects the whole message for one missed character. Plain text loses the bold line Discord has. The word joiner plays the role of Discord's `allowed_mentions: { parse: [] }` |
| Link previews | `link_preview_options: { is_disabled: true }` | `disable_web_page_preview` | The old flag is deprecated. Telegram must not fetch a private address to unfurl it, which is why Discord puts the link in angle brackets |
| Token at rest | Data Protection, purpose `JxFinance.Telegram.BotToken`, never returned; `GET` answers `hasToken` | A plain column | The token is a bearer credential with full control of the bot, so it is handled like the Discord URL and the SMTP password, backups included |
| Chat id | A plain `long?` column, a whole number that may be negative, typed by the administrator | `@channelname`; finding the chat with a "Detect chat" button over `getUpdates` | Groups and supergroups have numeric ids, and a public `@name` only works for channels. Detecting the chat needs the bot to read the group's traffic, which this plan avoids. The tab's description says how to find the id |
| Group upgraded to a supergroup | A 400 that carries `parameters.migrate_to_chat_id` stores the new id on `InstanceSettings` and retries that message once in the same pass | Giving up and asking the administrator | Telegram changes the id of a group silently when it gains admins or members past a limit. The new id comes in the error, so following it costs a few lines |
| Poster name | None: the bot's own name from BotFather | Sending the installation name | The Bot API has no per-message sender name |
| Topics in forum supergroups | Left out | An optional `message_thread_id` | Nobody asked for it. It can be added as one column later |

## Data model

| Change | Detail |
| --- | --- |
| `InstanceSettings` | `TelegramEnabled` (default false), `TelegramProtectedToken` (max 1000, empty when none, a concurrency token), `TelegramChatId?` (`bigint`), `TelegramLastDeliveredAt?`, `TelegramLastError?` (max 500), `TelegramDisabledByTelegramAt?`, and `RecordTelegramSend(now, error, gone)` like `RecordDiscordSend` |
| `AppUser.TelegramNotificationTypes` | A `jsonb` list of `NotificationType`, default `'[]'`, like `DiscordNotificationTypes` |
| `TelegramMessage : OutboxMessage` | `UserId`, `NotificationType` (stored as its name, max 40), `Content` (max 4096, Telegram's limit). Same indexes and filtered unique `DedupeKey` as `DiscordMessages`, and like them no owner and no query filter |
| `InstanceSettingsSnapshot.TelegramEnabled` | True only when the switch is on, a token is saved and a chat id is set |
| `AppLock.TelegramOutbox` | A new advisory lock id |
| Migration | `just migrate-add AddTelegramNotifications` |

## Backend steps

1. **Refactor first, alone.** Extract `ChatOutboxJob<TMessage> where TMessage : OutboxMessage, IChatMessage` from `DiscordOutboxJob`, where `IChatMessage` exposes `UserId` and `NotificationType`. Run `just test-class DiscordNotificationTests` before going on.
2. **Domain and EF.** The data model above: `TelegramMessageConfiguration`, the `AppDbContext` set, the `InstanceSettingsConfiguration` and `AppUserConfiguration` columns, then the migration.
3. **`Common/Telegram`:**
   - `TelegramBotToken.TryParse`: `^\d{1,20}:[A-Za-z0-9_-]{30,100}$`, at most 130 characters. Anything else answers `telegram.invalidToken`. The token only ever goes into the path of a fixed base address, so it cannot steer the request elsewhere.
   - `TelegramTarget(Token, ChatId)`, whose `ToString` hides the token.
   - `TelegramTokenSecret.Protect` and `Read`, like `DiscordWebhookSecret`.
   - `TelegramText.Escape`.
   - `TelegramSendResult(DomainError? Error, TimeSpan? RetryAfter, long? MigrateToChatId)`.
   - `ITelegramBotClient.SendAsync(TelegramTarget, string html, ct)`.
4. **Client.** `Infrastructure/Telegram/TelegramBotClient` is a typed `HttpClient` with base `https://api.telegram.org/`, a 10-second timeout, a 64 KB buffer, user agent `JxFinance/1.0` and `.RemoveAllLoggers()`. It posts `{ chat_id, text, parse_mode: "HTML", link_preview_options: { is_disabled: true } }` to `bot{token}/sendMessage`. Telegram answers `{ ok, description, error_code, parameters }`:

   | Telegram answers | Result |
   | --- | --- |
   | `ok: true` | success |
   | 429 | `telegram.rateLimited`, with `parameters.retry_after` clamped to 1–3600 seconds, or 30 seconds |
   | 400 with `parameters.migrate_to_chat_id` | `MigrateToChatId` set and no error |
   | 401, or 403 (the bot was removed from the group) | `telegram.botRemoved` |
   | any other 4xx, "chat not found" included | `telegram.rejected`, with Telegram's `description` clipped to 300 characters |
   | 5xx, a timeout or a network error | `telegram.sendFailed` |

   Register it in `ApiServiceExtensions` beside the Discord client. In `TelemetryExtensions`, add `RedactedTelegramUrl`, which traces `https://api.telegram.org/bot***/sendMessage`.
5. **Texts.** `NotificationTexts.Telegram(language, notification, member, siteUrl)` writes `{member} · <b>{title}</b>`, then the sentence, the digest lines and the `PageLink` URL as plain text, clipped to 4096 with an ellipsis. `NotificationTexts.TelegramTest(language, product)`. Escaping happens before the tags are added and before the length is clipped, so a clip can never cut through an entity: clip the escaped body first, then wrap it.
6. **Publisher.** `NotificationPublisher` gains Telegram kinds and queued Telegram keys beside Discord's. "Was this owner preloaded" moves off `discordTypes` into one `members` dictionary holding the name, the language and both kind sets. `PreloadAsync` reads `TelegramNotificationTypes` while `TelegramEnabled` and loads today's Telegram dedupe keys. The dedupe key format stays the same.
7. **Outbox job.** `TelegramOutboxJob : ChatOutboxJob<TelegramMessage>`, every 30 seconds, `BatchSize` = 5. Telegram allows about 20 messages a minute in one group, and a pass of five every 30 seconds stays under that. 429, removed and other failures behave as the Discord table says, with `TelegramDisabledByTelegramAt` as the mark. A migrate answer updates `TelegramChatId` and sends the row again once. Register it next to `DiscordOutboxJob`.
8. **Settings slices** in `Endpoints/Settings`, through a new `ITelegramSettingsService` and `TelegramSettingsService`:
   - `GET settings/telegram` answers `{ enabled, hasToken, chatId, lastDeliveredAt, lastError, disabledByTelegram, unreadable }`.
   - `PUT settings/telegram` takes `{ enabled, botToken?, chatId? }` and is throttled to 20 calls per five minutes. An empty token keeps the stored one. A new token or chat id clears the mark and the last error. Switching on without both answers `telegram.invalidToken` or `telegram.invalidChat`. The store is refreshed after the commit.
   - `POST settings/telegram/test` is throttled to 10 calls per five minutes. It answers 404 without a token and a chat id, sends synchronously in the administrator's language, and records the outcome.
9. **User slice.** `PUT users/me/telegram-notifications` takes `{ types }`, follows the Discord validator, answers `UserProfileResponse`, and goes through `IUserService`. `UserProfileResponse.TelegramNotificationTypes`, `PublicSettingsResponse.TelegramEnabled`.
10. **Everything else that names Discord:**
    - `MonthlyDigestJob` also runs for members who ticked `monthlyDigest` for Telegram while it is enabled.
    - `UserExportTables` lists `TelegramNotificationTypes` in the `AspNetUsers` row and adds `TelegramMessages` as `Excluded("outbox")`.
    - `BackupDatabase` treats `TelegramMessages` as transient.
    - The OpenAPI summaries of digest scopes and language mention Telegram.
11. **Error codes** in `ErrorCodes.cs`, all 400, with English and Lithuanian text in `common.json`: `telegram.invalidToken`, `telegram.invalidChat`, `telegram.tokenUnreadable`, `telegram.botRemoved`, `telegram.rateLimited`, `telegram.rejected`, `telegram.sendFailed`.

## Frontend steps

1. `just gen`. In `src/api/invalidation.ts`, saving Telegram settings refreshes them and the public settings, a test refreshes the Telegram settings, and the user slice refreshes the profile.
2. `just new-component settings telegram-section`. The form follows `DiscordSection`:
   - alerts for "removed from the group" and an unreadable token;
   - the checkbox "Send notifications to Telegram";
   - the bot token as a password input, whose placeholder says when one is saved;
   - the chat id as a text input;
   - the delivery line and the last error;
   - Test and Save.

   A zod check mirrors the server rules. The short description says to create the bot with @BotFather, add it to the group, and copy the group's id. If `DiscordSection` holds the alert and delivery-line markup inline, move it into one shared component used by both, rather than copying it.
3. `NotificationProvidersSection` gets a third tab, `telegram`, with the lucide `Send` icon.
4. `notification-channels-fields.tsx` adds `telegram` to `notificationChannels` and to the field group. `notifications-form.tsx` adds the list, calls the new endpoint only when it changed, and shows the column while `useTelegramEnabled()` (in `hooks/use-settings.ts`) is true. The "no channel is set up" text names Telegram too.
5. Add `storybook/fixtures/telegram.ts`, Telegram handlers in `handlers/settings.ts` and `handlers/users.ts`, and the profile and public settings fixtures.
6. Stories:
   - `telegram-section`: off, on and delivered, removed from the group, unreadable, pending, and `failWith`.
   - The providers section shows three tabs.
   - The notifications section has a story with all three columns.
7. Add the locales in `en` and `lt`: `settings.telegram.*`, `profile.notifications.telegram`, and the error codes.

## Tests

- **Unit:**
  - `TelegramBotTokenTests`: valid tokens; a slash, `?`, a space, no colon and too long are refused.
  - `NotificationTextsTests`: a name with `<b>`, `&` and `@everyone` comes out escaped with the word joiner, a long digest is clipped below 4096 with no broken entity, and the "every kind has text" test covers Telegram.
- **Integration**, `TelegramNotificationTests` with `FakeTelegramBotClient` in `ApiFixture`:
  - the administrator-only routes, and the token never returned;
  - switching on without a token or a chat id;
  - a member ticking kinds;
  - a bill reminder posted with the name in front only while the switch is on and the kind is ticked;
  - a job run twice queuing one message;
  - 429 moving the batch;
  - 401 giving up the queue until a new token is saved;
  - a migrate answer updating the chat id and delivering.
- `DiscordNotificationTests` stay green after step 1, unchanged.
- `BackupEndpointTests` round-trips the token and the kinds, and drops the queue. `UserExportTablesTests` fails until step 10.
- **Frontend:** `telegram-section.test.tsx` covers save, test and the client check. The providers and notifications section tests cover the new tab and column. The contract test covers the fixtures.

## Docs

- New `docs/features/telegram-notifications.md`, modelled on the Discord page, with a row in `docs/features/README.md`.
- New `docs/decisions/telegram-notifications.md` with the decision table above as its first Log entries and a row in `docs/decisions/README.md`.
- An entry in `docs/decisions/discord-notifications.md` for the `ChatOutboxJob` extraction.
- Update these pages:
  - `notifications.md`: a "Telegram beside the bell" section and the "Choosing channels" text.
  - `scope.md`: a Telegram section and the notifications paragraph.
  - `api.md`, `data-model.md`, `architecture/background-jobs.md` and `installation-settings.md`.
  - `backup-and-restore.md` and `monthly-digest.md`.
  - The fan-out and system-context diagrams (`just diagrams`).
- In `backlog.md`, add a done row. Add "a real Telegram bot and group" to the real outside services row, to confirm the word-joiner mention guard and the migrate answer against the live API.
- Delete this plan when it ships.
