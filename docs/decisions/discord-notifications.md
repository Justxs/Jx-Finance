# Discord notifications: decisions

Related: feature page [Discord notifications](../features/discord-notifications.md); architecture [Background work and notifications](../architecture/background-jobs.md).

## Current

Implemented 2026-09-26, changed 2026-10-03. One Discord channel for the whole installation: an administrator saves its webhook and switches Discord on in Settings › Installation › Notification providers › Discord, off by default. Members only choose, in the Discord column of the table in Settings › Personal › Notifications, which of their notification kinds go there, and each message starts with the member's display name. Everyone who can read the channel sees every member's ticked notifications. The URL must be a Discord webhook on one of Discord's own hosts, is data-protected in `InstanceSettings` and never returned; every producer writes through `INotificationPublisher`, which adds the in-app row, the email and the Discord post in the producer's transaction; posts leave through a `DiscordMessages` outbox, whose row holds the member's id and never the URL, so a replaced or switched-off webhook applies to queued posts, drained every 30 seconds, five at a time, by the drain shared with Telegram since 2026-10-03, as plain text in the member's language with mentions switched off. A 429 moves the posts to Discord's `retry_after`, a 401, 403 or 404 gives up the pending posts and marks the channel disabled by Discord until a new URL is saved or a test succeeds, and rows older than seven days are deleted, sent or not. The page link is appended in angle brackets, and the poster name is the installation name unless it is empty or contains "discord" or "clyde", when it is "Jx Finance"

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

Older entries are in the git history of this file (`git log -p -- docs/decisions/discord-notifications.md`).

- **2026-10-03.** The drain of `DiscordOutboxJob` moves into an abstract `ChatOutboxJob<TMessage>` shared with the new `TelegramOutboxJob`; the Discord job keeps its table, lock, settings fields and send, and maps the client's answer to a `ChatSendResult`. The "There is no active … any more" reason now names the channel rather than the webhook
  - Rejected: Copying the job for Telegram; one outbox table for both channels
  - Why: The claim, the ordering and the concurrency-safe save are where a copy would drift. Each channel keeps its own table because limits, locks and content formats differ. See [Telegram notifications: decisions](telegram-notifications.md)
- **2026-10-03.** Discord posts go to one installation channel whose webhook an administrator sets under Notification providers; members only choose their kinds (`AspNetUsers.DiscordNotificationTypes`), and every message starts with the member's display name. The personal webhooks, their table and the profile's "Discord channel" panel are removed, and existing personal webhooks are not carried over. This replaces the 2026-09-26 entry that chose one webhook per user and the guarantee that nobody's alerts reach anyone else's channel
  - Rejected: Keeping a personal webhook per member; an installation default plus a personal override; a shared channel without a name prefix
  - Why: The owner wants the URL set once, on the Notification providers page, next to the mail server. A default plus an override means two delivery targets, two status panels and more code for a household that shares one server. In a shared channel a message without the name would not say whose alert it is. The outbox drains five rows a pass with no per-user limit, because every post now goes to one webhook that Discord limits to about 5 requests per 2 seconds; it saves the outcomes once at the end of the pass, and a conflict with a URL an administrator replaced meanwhile detaches the conflicting entries and retries

- **2026-09-27, superseded on 2026-10-03 for the webhook panel.** The Discord choices move into one Notifications section with the email choices: a table of kinds against "In app", "Email" and "Discord", the webhook in a "Discord channel" panel under it, and one Save that calls each endpoint only when its part changed
  - Rejected: Separate Email and Discord sections, each with its own list of kinds and its own Save; a Save per panel inside the one section
  - Why: With email now available for every kind, two sections would have listed the same kinds twice and made the reader compare two pages to see where a budget alert goes. One table answers that at a glance, a disabled column with a note says why a channel is unavailable, and one Save matches every other form in the product. The two endpoints stay separate, as decided for email, so the form only sends what changed and an email-only change never touches the webhook
- **2026-09-27, superseded on 2026-10-03.** The outbox job saves each user's outcomes as soon as that user's rows are sent, with no cancellation token, and `DiscordWebhook.ProtectedUrl` is a concurrency token; a row or webhook changed underneath the job is left out of the save instead of failing it
  - Rejected: One save at the end of the pass; writing each outcome with `ExecuteUpdate`
  - Why: With one save, removing a webhook mid-pass (which deletes its unsent rows) or stopping the host threw away the `SentAt` of posts already delivered, and they went out again after the backoff. A stale 404 for a replaced URL also marked the new webhook as gone. Per-user saves keep the change small and keep the job on tracked entities like the email outbox
- **2026-09-26, superseded on 2026-10-03.** Discord notifications go to one webhook per user, set on the profile; an installation switch in Settings allows or stops all Discord traffic
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
