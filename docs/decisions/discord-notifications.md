# Discord notifications: decisions

Related: feature page [Discord notifications](../features/discord-notifications.md); architecture [Background work and notifications](../architecture/background-jobs.md).

## Current

Implemented 2026-09-26. One personal webhook per user, set on the profile with the notification kinds it takes, behind one installation setting that allows or stops all Discord traffic and is off by default; the URL must be a Discord webhook on one of Discord's own hosts, is data-protected and never returned; every producer writes through `INotificationPublisher`, which adds the in-app row, the email and the Discord post in the producer's transaction; posts leave through a `DiscordMessages` outbox drained every 30 seconds, as plain text in the installation language with mentions switched off

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-27.** The outbox job saves each user's outcomes as soon as that user's rows are sent, with no cancellation token, and `DiscordWebhook.ProtectedUrl` is a concurrency token; a row or webhook changed underneath the job is left out of the save instead of failing it
  - Rejected: One save at the end of the pass; writing each outcome with `ExecuteUpdate`
  - Why: With one save, removing a webhook mid-pass (which deletes its unsent rows) or stopping the host threw away the `SentAt` of posts already delivered, and they went out again after the backoff. A stale 404 for a replaced URL also marked the new webhook as gone. Per-user saves keep the change small and keep the job on tracked entities like the email outbox
- **2026-09-26.** Discord notifications go to one webhook per user, set on the profile; an installation switch in Settings allows or stops all Discord traffic
  - Rejected: One installation webhook; both an installation webhook and personal ones
  - Why: Budget and bill alerts are personal. One shared channel would show every member's alerts to everyone in it
- **2026-09-26.** The installation switch is a setting with its own enabled flag, `InstanceSettings.DiscordEnabled` behind `settings/discord`, like SMTP, not a feature switch
  - Rejected: A `Feature.Discord` flag in `FeatureFlags`
  - Why: Email set the precedent: delivery channels are settings, feature switches hide screens. The profile's Discord section stays visible while the switch is off and says why, instead of disappearing
- **2026-09-26.** Discord posts are written to a `DiscordMessages` outbox table and sent by `DiscordOutboxJob`, like `EmailMessages`
  - Rejected: Posting from the job that raised the notification
  - Why: No job or request may wait for an outside service, and retries and rate limits need a row to live on
- **2026-09-26.** Fan-out happens in one `INotificationPublisher.Publish(notification)` that every producer calls; it adds the in-app row and the Discord message to the producer's own context, and the bill reminder keeps enqueueing its email itself
  - Rejected: A change-tracker hook in `AppDbContext` like the audit collector; separate calls to each channel in each job
  - Why: Explicit and testable. An architecture test, `NotificationPublisherTests`, keeps `Notifications.Add` inside the publisher, so a new producer reaches every channel
- **2026-09-26.** The Discord text is built on the server at enqueue time, in the installation language, by `NotificationTexts` (en and lt), and stored in the outbox row
  - Rejected: Posting `Notification.Title` and `Message` as they are
  - Why: `Message` is raw data, an ISO date or a percentage, not a sentence. A unit test fails for a kind without text in either language
- **2026-09-26.** The webhook URL is encrypted with Data Protection (purpose `JxFinance.Discord.Webhook`) and never returned; the response carries `hasWebhook`
  - Rejected: A plain column
  - Why: The URL is a bearer credential: anyone holding it can post to the channel. It is handled like the SMTP password and the Flex token, including in backups
- **2026-09-26.** The outbox row stores the user id and the job looks the webhook up at send time
  - Rejected: Copying the URL into the row
  - Why: Changing, switching off or removing the webhook takes effect for messages still queued, and the secret lives in one place
- **2026-09-26.** The Discord dedupe key is `{userId}:{type}:{relatedId or notification id}:{local date}`
  - Rejected: `{type}:{relatedId}:{local date}`, as planned
  - Why: The related id is not guaranteed to be private to one user, and two users notified about the same row on the same day would collide on the unique index and one of them would lose the post
- **2026-09-26.** `Publish` throws `InvalidOperationException` for an owner that `PreloadAsync` did not load
  - Rejected: Loading the webhook lazily on the first `Publish` for an owner; treating an unloaded owner as having no webhook
  - Why: A lazy load puts one query per notification back into a pass over many users, and a silent default would make a producer that forgot the preload send nothing to Discord with every test still green
- **2026-09-26.** `DiscordOutboxJob` deletes every row older than 7 days, sent or not, before it looks at the switch
  - Rejected: Pruning only sent and given-up rows, as `EmailOutboxJob` does
  - Why: A post queued before an administrator switched Discord off would otherwise be sent days late when it is switched back on, when an alert about spending or a due date has lost its point
- **2026-09-26.** A 429 hands the attempt back to that row and to the rest of the user's batch and moves them to `retry_after`; a 401, 403 or 404 gives up every pending row of the user and sets `DisabledByDiscordAt` on the webhook until a new URL is saved or a test succeeds
  - Rejected: Counting a 429 as a failed attempt; continuing with the user's next row after a 429; retrying a deleted webhook with the ordinary backoff
  - Why: Discord asked to wait, so the next row would be refused too and a busy channel would burn its five attempts on rate limits alone. A deleted webhook will never answer again, and retrying it for hours would only fill the log
- **2026-09-26.** Removing the webhook soft-deletes it with the protected URL blanked and hard-deletes its unsent messages
  - Rejected: A hard delete that bypasses the soft-delete rule; a soft delete that keeps the ciphertext; leaving the queued posts for the job to give up
  - Why: A delete of an ownable entity is a soft delete everywhere else, and the unique index is filtered to rows not deleted, so a new webhook can be saved at once. A removed credential should not survive in the database, or in the next backup, just because the row does. Queued posts would only be given up one by one, and deleting them makes "Remove" final at once
- **2026-09-26.** The page link is appended in angle brackets, and the poster name is the installation name unless it is empty or contains "discord" or "clyde", when it is "Jx Finance"
  - Rejected: A bare link; always "Jx Finance"; embeds
  - Why: Angle brackets stop Discord from fetching a preview of an address that is usually private. Discord refuses a username containing either word, and a refused name would fail every post. Embeds stay in the backlog
