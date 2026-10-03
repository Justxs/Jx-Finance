# Telegram notifications: decisions

Related: feature page [Telegram notifications](../features/telegram-notifications.md); [Discord notifications: decisions](discord-notifications.md); architecture [Background work and notifications](../architecture/background-jobs.md).

## Current

Implemented 2026-10-03. One Telegram group for the whole installation, as with Discord: an administrator saves a bot token from @BotFather and the group's chat id in Settings › Installation › Notification providers › Telegram and switches Telegram on, off by default. Members tick their kinds in the Telegram column of Settings › Personal › Notifications, and each message starts with the member's display name. The token is data-protected in `InstanceSettings` and never returned; the chat id is a plain `bigint`. Messages go through a `TelegramMessages` outbox drained every 30 seconds, five at a time, by `TelegramOutboxJob`, which shares `ChatOutboxJob` with Discord. They are sent as HTML with three characters escaped, a word joiner after every `@` and link previews off. A 401 or 403 marks the bot removed until a new token or chat id is saved or a test succeeds, and a supergroup move is followed to the new chat id. The server only calls `sendMessage`; it never reads from Telegram.

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

Older entries are in the git history of this file (`git log -p -- docs/decisions/telegram-notifications.md`).

- **2026-10-03.** One Telegram group for the installation, set by an administrator, with the member's name in front of each message (owner's choice)
  - Rejected: A private chat per member, linked through a `t.me/<bot>?start=<code>` deep link and a `getUpdates` poll; both a group and private chats
  - Why: It matches Discord, so members learn one model, and it needs no inbound traffic, no link codes, no polling job and no per-user chat column. Private chats would have made the server read from an outside service for the first time
- **2026-10-03.** A `TelegramMessages` outbox of its own, drained by `TelegramOutboxJob`; the shared drain moved out of `DiscordOutboxJob` into an abstract `ChatOutboxJob<TMessage>`, and each job supplies its table, lock, settings fields and send
  - Rejected: One `ChatMessages` table with a channel column, migrating `DiscordMessages` into it; copying the 210-line Discord job
  - Why: Email and Discord each have their own table, and each channel has its own lock, limits and content format. The claim, the ordering and the concurrency-safe save are the parts most easily copied wrong, and with two users the extraction is no longer a one-use abstraction. `DiscordNotificationTests` passed unchanged after the move
- **2026-10-03.** Messages are sent with `parse_mode: "HTML"`: `&`, `<` and `>` become entities, line breaks become spaces, a U+2060 word joiner follows every `@`, and only the first line carries `<b>`
  - Rejected: MarkdownV2; plain text
  - Why: HTML needs three escapes, where MarkdownV2 needs eighteen and refuses the whole message for one that is missed. Plain text would lose the bold first line Discord has. The word joiner plays the part of Discord's `allowed_mentions: { parse: [] }`: a mention in a name or payee does not reach anyone. This guard still needs a check against the live API
- **2026-10-03.** Link previews are switched off with `link_preview_options: { is_disabled: true }`
  - Rejected: `disable_web_page_preview`
  - Why: The older flag is deprecated. Telegram must not fetch a private address to unfurl it, which is the same reason Discord's link is wrapped in angle brackets
- **2026-10-03.** The chat id is a whole number typed by the administrator, a plain `bigint` column and a concurrency token beside the protected token; the hint says how to read it from `getUpdates`
  - Rejected: `@channelname`; a "Detect chat" button that calls `getUpdates`
  - Why: Groups and supergroups have numeric ids, and a public `@name` only works for channels. Detecting the chat means reading the group's traffic, which the installation otherwise never does. The id is not a secret without the token
- **2026-10-03.** A 400 that carries `parameters.migrate_to_chat_id` stores the new id on `InstanceSettings` and sends again once, in the job and in the test send, through `TelegramDelivery.SendAsync`
  - Rejected: Giving up and asking the administrator for the new id
  - Why: Telegram changes a group's id without warning when it becomes a supergroup, and the new id comes in the error itself. This still needs a check against the live API
- **2026-10-03.** No sender name is set; the bot posts under the name given to @BotFather. Topics in forum supergroups are not supported
  - Rejected: The installation name as sender; an optional `message_thread_id`
  - Why: The Bot API has no per-message sender name. Nobody asked for topics, and they can be added later as one column
