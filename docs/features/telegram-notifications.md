# Telegram notifications

Back to the [feature walkthrough](README.md). See also [decisions](../decisions/telegram-notifications.md), [Discord notifications](discord-notifications.md), [architecture: Background work and notifications](../architecture/background-jobs.md).

Backend `Settings` (`settings/telegram` and `settings/telegram/test` through `TelegramSettingsService`) and `Users` (`users/me/telegram-notifications`), the fan-out in `Common/Notifications` (`INotificationPublisher`, `NotificationTexts.Telegram`), the token rules, texts and delivery in `Common/Telegram`, the transport in `Infrastructure/Telegram/TelegramBotClient` and the drain in `Infrastructure/BackgroundJobs/TelegramOutboxJob`, which shares `ChatOutboxJob` with Discord. Frontend: the Telegram tab of the `notificationProviders` section of `/settings` (`features/settings/telegram-section`, inside `features/settings/notification-providers-section`) and the Telegram column of the `notifications` section of `/profile`.

An administrator creates a bot with @BotFather, adds it to a Telegram group, and saves the bot token and the group's chat id in Settings › Installation › Notification providers › Telegram, then switches Telegram on. Each member then ticks, in Settings › Personal › Notifications, which of their notification kinds should also go to that group, and from then on every in-app notification of those kinds is posted there with the member's display name in front. It is the same model as [Discord](discord-notifications.md): one shared group for the installation, so everyone in it sees every member's ticked notifications.

Telegram is not a feature switch. It is one installation setting with its own enabled flag, `InstanceSettings.TelegramEnabled`, off by default; turning it off stops every post and leaves every route, the saved token, the chat id and every member's ticked kinds in place.

The server only ever calls `sendMessage` on `api.telegram.org`. The bot never reads the group: there is no webhook, no `getUpdates` poll and no inbound traffic.

## One group, chosen kinds

A message is queued only when the installation switch is on, a token and a chat id are saved, and the member ticked that kind, at the moment the notification is written. `InstanceSettingsSnapshot.TelegramEnabled` is true only when all three hold, and `PublicSettingsResponse.telegramEnabled` reads the same flag.

| Row | What it holds |
| --- | --- |
| `InstanceSettings.TelegramEnabled` | The installation switch, default false |
| `InstanceSettings.TelegramProtectedToken` | The bot token as Data Protection ciphertext (max 1000), empty when none is saved; a concurrency token |
| `InstanceSettings.TelegramChatId?` | The group's id, a `bigint`, negative for a group; a concurrency token |
| `InstanceSettings.TelegramLastDeliveredAt?`, `TelegramLastError?` (max 500), `TelegramDisabledByTelegramAt?` | The delivery status, written by `RecordTelegramSend(now, error, gone)` the way `RecordDiscordSend` writes Discord's |
| `AspNetUsers.TelegramNotificationTypes` | The member's kinds, a `jsonb` list of `NotificationType`, default `'[]'` |
| `TelegramMessage` | The outbox, shaped like `DiscordMessage`: `Id`, `UserId`, `NotificationType`, `Content` (max 4096, Telegram's limit), `DedupeKey?` (unique, filtered), `CreatedAt`, `NextAttemptAt`, `SentAt?`, `Attempts`, `LastError?` |

The outbox row stores the member's id, never the token or the chat id, so a replaced token or group applies to messages still queued.

## Message text

`NotificationTexts.Telegram(language, notification, member, siteUrl)` is sent with `parse_mode: "HTML"`. The first line is `{member} · <b>{title}</b>`, with the title clipped to 256 characters first. The sentence follows on the second line, then for `monthlyDigest` the lines of `NotificationTexts.DigestDetails`, and, when `App:SiteUrl` is set, the page link as plain text. The kinds, sentences, languages and links are the ones in the [Discord table](discord-notifications.md#message-text).

`TelegramText.Escape` turns `&`, `<` and `>` into entities, turns line breaks and tabs into spaces, and puts U+2060 WORD JOINER after every `@`, so no name or payee can add markup or mention anyone in the group. The whole message is clipped to 4096 characters by `TelegramText.Clip`, which never cuts an entity or, through `TextLimit.Prefix`, an emoji in half; only the first line carries tags, and it is far below the limit. Link previews are off through `link_preview_options: { is_disabled: true }`, so Telegram never fetches a private address. The bot posts under its own name from @BotFather, because the Bot API has no per-message sender name. The test message is `NotificationTexts.TelegramTest`, in the administrator's language.

## The bot token

The token controls the bot, so it is handled like the Discord webhook and the SMTP password.

- **Only a token.** `TelegramBotToken.TryParse` accepts `{1–20 digits}:{30–100 of A-Z a-z 0-9 _ -}`, at most 130 characters, and nothing else answers `telegram.invalidToken`. The token only ever goes into the path of a fixed base address, `https://api.telegram.org/bot{token}/sendMessage`, so it cannot steer the request elsewhere.
- **Encrypted at rest.** `TelegramTokenSecret` protects it with Data Protection purpose `JxFinance.Telegram.BotToken`. No response carries it: `GET` answers `hasToken`, and the field is a password input whose placeholder says a token is saved.
- **Unreadable after a move.** A stored value the key ring cannot decrypt answers `telegram.tokenUnreadable` on a test send and `unreadable: true` on `GET`, and the tab asks for the token again.
- **No token in logs.** `TelegramTarget.ToString` and `UpdateTelegramSettingsRequest` hide it, the typed client has its HTTP logging removed, and the trace of the outgoing call carries `https://api.telegram.org/bot***/sendMessage` through `TelemetryExtensions.RedactedTelegramUrl`.

The chat id is not a secret: without the token it is useless, and the tab shows it so it can be corrected.

## The client

`TelegramBotClient` implements `ITelegramBotClient.SendAsync(TelegramTarget, html, ct)` as a typed `HttpClient` that posts to `/bot{token}/sendMessage`; the leading slash matters, because without it `bot123456789:` reads as a URI scheme and the request would leave the base address: base address `https://api.telegram.org/`, a 10-second timeout, a 64 KB response buffer, user agent `JxFinance/1.0` and `.RemoveAllLoggers()`. It reads Telegram's `{ description, parameters }` on a failure and answers a `TelegramSendResult(Error, RetryAfter, MigrateToChatId)`:

| Telegram answers | Result |
| --- | --- |
| 2xx | success |
| 429 | `telegram.rateLimited`, with `parameters.retry_after` clamped to 1–3600 seconds, 30 seconds when it is missing |
| 400 with `parameters.migrate_to_chat_id` | `telegram.rejected` with `MigrateToChatId` set |
| 401 or 403 | `telegram.botRemoved` |
| any other 4xx, "chat not found" included | `telegram.rejected`, with Telegram's `description` clipped to 300 characters |
| 5xx, a timeout or a network error | `telegram.sendFailed` |

A group that gains enough members or admins becomes a supergroup with a new id, and Telegram says so in the error. `TelegramDelivery.SendAsync`, used by the job and the test send, stores the new id on `InstanceSettings.TelegramChatId` and sends once more to it.

## The outbox job

`TelegramOutboxJob` is a `ChatOutboxJob<TelegramMessage>`, the drain it shares with `DiscordOutboxJob`, under `AppLock.TelegramOutbox` (`738192450`). It runs every 30 seconds and sends at most five rows a pass, which stays under Telegram's limit of about 20 messages a minute in one group. Pruning after seven days, the claim before any socket is opened, the members' current kinds, the order, the backoff and the save that drops an outcome for a token or chat id an administrator replaced meanwhile are described under [the Discord outbox job](discord-notifications.md#the-outbox-job); `telegram.rateLimited` and `telegram.botRemoved` play the parts of Discord's 429 and gone webhook, and `TelegramDisabledByTelegramAt` is the mark. A removed bot stays marked until an administrator saves a new token or chat id or a test send succeeds.

## Endpoints

| Route | Who | What it does |
| --- | --- | --- |
| `GET /api/settings/telegram` | Admin | `{ enabled, hasToken, chatId, lastDeliveredAt, lastError, disabledByTelegram, unreadable }`, never the token |
| `PUT /api/settings/telegram` | Admin | `{ enabled, botToken?, chatId? }`, throttled to 20 calls per five minutes, answers the same response as `GET`. An empty token keeps the stored one; `chatId` is stored as sent, and null removes it. A new token or a different chat id clears the mark and the last error. Switching on without a token answers `telegram.invalidToken`, without a chat id `telegram.invalidChat`, and so does a chat id of 0. The settings store is refreshed after the commit |
| `POST /api/settings/telegram/test` | Admin | Throttled to 10 calls per five minutes. 404 without a token and a chat id. Works while the switch is off. Sends synchronously in the administrator's language, follows a supergroup move, and answers 204 or Telegram's own error; the outcome is recorded with `RecordTelegramSend` |
| `PUT /api/users/me/telegram-notifications` | any signed-in user | `{ types }`, throttled to 20 calls per five minutes, answers `UserProfileResponse` with `telegramNotificationTypes`. A kind listed twice answers `collection.invalidSize` |

## Screens

Settings › Installation › Notification providers has a third tab, Telegram, holding `TelegramSection`: a description, then one form with the alerts for a removed bot and an unreadable token, the checkbox "Send notifications to Telegram", the bot token as a password input, the group chat id as a text input, the delivery line and last error of `DeliveryStatus` (shared with the Discord tab), "Send a test message", disabled until a token and a chat id are saved, and Save. The hints say how to get a token from @BotFather and how to read the group's id from `getUpdates` after adding the bot. The test and save row is `ChannelActions`, also shared with Discord. A client-side check mirrors the server's token rule, takes a chat id of up to 16 digits with an optional minus that a JavaScript number holds exactly, and requires both when Telegram is switched on. The form is keyed on the stored chat id, so after a test send that followed the group to a supergroup the field shows the new id rather than writing the old one back on the next Save.

In Settings › Personal › Notifications the table gains a Telegram column while `telegramEnabled` from the public settings is true (`useTelegramEnabled()` in `hooks/use-settings.ts`). Save calls `PUT users/me/telegram-notifications` only when the ticked Telegram kinds changed. The mutations are listed in `src/api/invalidation.ts` like Discord's.

## Backup and restore

`TelegramProtectedToken` travels inside `InstanceSettings` as ciphertext and is readable again only under the same key ring, and `TelegramChatId` with it. `TelegramNotificationTypes` travels with `AspNetUsers` and is part of the member export's user row. `TelegramMessages` is transient like `DiscordMessages`: a restore drops it, and the member export leaves it out as an outbox.

## Error codes

All answer 400.

| Code | When |
| --- | --- |
| `telegram.invalidToken` | The token does not have the @BotFather shape, on save or when the stored value is read back, or Telegram is switched on with no token saved |
| `telegram.invalidChat` | The chat id is 0, or Telegram is switched on without one |
| `telegram.tokenUnreadable` | The stored token cannot be decrypted with this installation's data protection keys |
| `telegram.botRemoved` | Telegram answered 401 or 403 |
| `telegram.rateLimited` | Telegram answered 429 |
| `telegram.rejected` | Telegram refused the message with another 4xx; the reason is its own text |
| `telegram.sendFailed` | Telegram answered 5xx, did not answer within 10 seconds, or could not be reached |

## Tests

No test opens a socket: `FakeTelegramBotClient` replaces the client in `ApiFixture` and records messages or answers with a chosen result per chat id. `TelegramNotificationTests` covers the administrator-only routes, saving and testing without ever returning the token, switching on without a token or a chat id and a malformed token, members choosing kinds, a bill reminder reaching the group with the escaped name in front only while the switch is on and the kind is ticked, a job run twice queuing one message, 429, a removed bot giving up the queue until a new token is saved, and a supergroup move delivering to the new id. `TelegramBotClientTests` runs the real client against a stub handler: the request URL, the JSON body, 429 with `retry_after`, the supergroup move and the status mapping. `TelegramBotTokenTests` covers the token shape, the hidden token and the redacted trace; `NotificationTextsTests` covers the escaping, the mention guard, the clipping and a Telegram text for every kind in both languages; `BackupEndpointTests` round-trips the token, the chat id and the kinds and drops the queue. On the frontend, `telegram-section.test.tsx`, the providers section test and the stories cover the tab, and the notifications section stories cover the column.
