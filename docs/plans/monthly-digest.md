# Plan: Monthly digest

Status: planned 2026-09-28. Size M. [Reconciliation](../features/reconciliation.md), whose account lines become open items here, has shipped. It also closes the per-user language gap of the Settings row in section 2 of the [backlog](../backlog.md), because the digest is the first long message a member reads outside the application.

## Outcome

- Settings › Personal › Notifications gets a new row, "Monthly digest", with Email and Discord checkboxes. Ticking either one is the opt-in. A member who ticks neither gets nothing, not even a bell row.
- In the first days of a month, each member who opted in receives one message about the month that just ended:
  - income, expenses, net and the share of income kept;
  - the three expense categories that moved most against the month before, with both amounts;
  - the open close items: uncategorised rows, unusual amounts, unconfirmed recurring entries and accounts not reconciled, or "Nothing left to do";
  - whether the month is closed;
  - a link to `/?month=yyyy-MM`, where the dashboard shows that month and its close panel.
- The message is in the member's own language. The language picked in the account menu is saved on the server and used for every email and Discord message, not only the digest.
- The bell shows the digest with a one-line summary and the same link.

## Decisions

| Topic | Decision | Rejected | Why |
| --- | --- | --- | --- |
| Source | `IMonthCloseService.GetMonthAsync("yyyy-MM")` for last month, run as the member in the "Everything" scope (no active household) | A second summary query for the digest | The digest then says exactly what the dashboard review says: `figures` from `ReportService.GetSummaryAsync` with `PreviousMonth`, and the same `checklist` |
| Running as the member | A scoped `JobUser` holder in `Infrastructure/Auth`. `ICurrentUser` resolves to its `FixedUser` inside a job's user scope and to `HttpCurrentUser` everywhere else. `PeriodicJob.RunAsUserAsync(userId, work)` opens that scope | Composing `MonthCloseService` by hand, as `NetWorthSnapshotter` composes `NetWorthService` | `MonthCloseService` takes nine dependencies, and each has its own. Composing them by hand would copy the DI graph into a job and drift from it the first time a constructor changed |
| Opt-in | A new `NotificationType.MonthlyDigest`. The job sends only to members who ticked it for Email or Discord, and the publisher writes the bell row next to those messages | A settings field of its own; a digest in everyone's bell | The notifications table is where each member chooses kinds and channels. A digest in the bell only would repeat the dashboard |
| When | A job that runs hourly on days 1 to 5 of the month, in the installation time zone, sends to each opted-in member on the first pass that finds no digest for that month yet. The deduplication is a `MonthlyDigest` notification whose `Message` is `yyyy-MM`, as `MonthCloseReminderJob` does | Exactly 08:00 on the 1st | A self-hosted server may be off on the 1st. The catch-up window is the reminder's, for the same reason |
| Empty month | No digest when the month has no transactions and no open items | Sending zeros | A message with nothing in it teaches people to ignore the next one |
| Reminder overlap | `MonthReadyToClose` stays as it is, and both can arrive on the same day. A member who wants one message unticks the reminder's channels | Suppressing the reminder for digest subscribers | The reminder is a to-do for people who close their months, and the digest is a summary for anyone. Both choices already sit in the same table |
| Movers | The three expense categories with the largest absolute change between `Amount` and `ComparisonAmount`, synthetic groups included | Percentage change | A 400% rise on €2 is noise. The dashboard's category card orders by amount too |
| Where text is built | The payload carries the numbers. `NotificationTexts` and a new `EmailTexts.MonthlyDigest` render them when the message is queued, in the recipient's language | Storing rendered text on the notification | This is how every other kind works. The bell renders its own text from the payload in the interface language |
| Language | A new nullable `AppUser.Language` (`en` or `lt`), saved whenever the member picks a language. `NotificationPublisher` uses it for email and Discord, falling back to `InstanceSettings.DefaultLanguage` when it is null. Month titles are rendered by the publisher from `Payload.Month`, not taken from the producer's `Title` | Keeping the installation language, as every message does today; a language per notification kind | The Email feature page already names this as a one-line change where `EmailTexts` is called. A null keeps today's behaviour for everyone who never picks a language. The digest is long enough that the wrong language matters |
| Switch | Gated by `MonthClose` through the job's `RequiredFeature`. No switch of its own | A `MonthlyDigest` switch | The per-member opt-in is the control. The review it reads is behind `MonthClose` anyway |

## Data model

| Change | Detail |
| --- | --- |
| `NotificationType.MonthlyDigest` | Appended |
| `NotificationPayload.Digest?` | A `MonthlyDigestPayload` record: `Currency`; `Income`, `Expense` and `Net` as strings, like the other payload amounts; `KeptPercent?`; `Movers`, up to three `{ Name, Amount, Previous }`; `Uncategorized`; `Unusual?`; `UnconfirmedRecurring?`; `AccountsNeedingAttention`; and `Closed`. The digest also fills the existing `Month`. Run `just migrate-add` if the model snapshot of the `jsonb` payload changes |
| `AppUser.Language?` | Text of at most 5 characters, `en` or `lt`. Null means the installation language. Backups carry it, because they copy every column of `AspNetUsers` |
| `AppLock.MonthlyDigest` | `738192443` |

## Backend steps

1. **Per-user language.**
   - Add the column with `just migrate-add AddUserLanguage`.
   - Add `PUT /api/users/me/language` in `Endpoints/Users/UpdateMyLanguage/`, taking `{ language }`. The validator checks `AppLanguages.All` and answers `enum.invalid`, as `UpdateSettingsValidator` does for `DefaultLanguage`. It is throttled like `email-notifications`.
   - `UserProfileResponse` gains `Language`.
   - `NotificationPublisher.PreloadAsync` reads each owner's language in the query it already runs. `QueueEmail` and `QueueDiscord` use that language.
   - A new `NotificationTexts.Title(language, notification)` renders the month title for `MonthReadyToClose` and `MonthlyDigest`, and returns `Title` for the other kinds.
2. **Job user scope.**
   - Add `Infrastructure/Auth/JobUser` (scoped, `FixedUser? User`).
   - In `Infrastructure/DependencyInjection.cs`, register `ICurrentUser` as `sp => sp.GetRequiredService<JobUser>().User ?? sp.GetRequiredService<HttpCurrentUser>()`, with `HttpCurrentUser` registered as itself.
   - Add `PeriodicJob.RunAsUserAsync(Guid userId, Func<IServiceProvider, Task> work)`. It opens a scope, sets `JobUser.User = new FixedUser(userId)` before anything else is resolved, runs `work`, and logs and isolates failures like `ForEachActiveUserAsync`.
   - Existing jobs stay as they are.
3. **Pure builder.** `Common/Notifications/MonthlyDigest.cs` has `From(MonthReviewResponse review)`, which returns a `MonthlyDigestPayload?`: null for an empty month. It picks the movers, computes the kept percentage (null without income) and counts accounts in `Differs` or `Behind` from the review's `checklist.accounts` (see [Reconciliation](../features/reconciliation.md#in-the-month-end-close)).
4. **Job.** `Infrastructure/BackgroundJobs/MonthlyDigestJob : PeriodicJob` runs hourly, with `RequiredFeature = Feature.MonthClose` and `LastDigestDay = 5`.
   - It picks the active users who ticked `MonthlyDigest` in `EmailNotificationTypes`, or who have an enabled webhook with it in `Types` while Discord is allowed. The two lists are read and filtered in memory, because the user table is small.
   - It leaves out users who already have a digest notification for the month.
   - For each remaining user, inside `RunAsUserAsync`, it:
     1. begins a transaction and takes `AppLock.MonthlyDigest`;
     2. checks the deduplication again;
     3. calls `GetMonthAsync`, builds the payload and skips an empty month;
     4. publishes `Notification { Type = MonthlyDigest, Title = month title, Message = "yyyy-MM", Payload = { Month, Digest } }` through `INotificationPublisher`, after `PreloadAsync`;
     5. saves and commits.
5. **Texts.**
   - `NotificationTexts.Sentence` gets a digest line such as "August 2026: income 3200.00 EUR, expenses 2450.00 EUR, 23% kept", in English and Lithuanian.
   - `NotificationTexts.Discord` adds the movers and the open items on their own lines, still clipped to 2000 characters.
   - `PagePath(MonthlyDigest)` is `/`, and `PageLink` adds the month as it does for the reminder.
   - `EmailTexts.MonthlyDigest(language, address, name, notification, siteUrl, product)` writes the subject "Your August 2026" and a plain-text body with the same parts. `NotificationPublisher.QueueEmail` picks it for this kind, stored as `EmailKind.Notification`, so the preload's deduplication keys still cover it.
   - `NotificationTextsTests` fails for a kind without text, so the new kind is covered.

## Frontend steps

1. **Contract.** Run `just gen`. Add the `updateMyLanguage` mutation to `invalidation.ts`, refreshing `getMeQueryKey`.
2. **Language.** `setLocale` in `src/stores/app-store.ts` also calls the generated `updateMyLanguage` request while a session exists, and ignores a failure: the interface language stays per browser as before. The root route's loader sends the browser's explicit `locale` once when the profile's `language` is null, so members who chose Lithuanian before this ships are covered. There is no `useEffect`.
3. **Notifications section.** The new kind appears in the table by itself, because the rows come from the enum. In `notifications-form.tsx`, its "In app" cell shows a dash labelled "Only sent with email or Discord" instead of the muted check, and a sentence under the table explains the digest.
4. **Bell.** Add `monthlyDigest` to the kind map in `notification-bell.tsx`, with feature `monthClose`, a link to `/?month=` and text `notifications.monthlyDigest`, built from the payload.
5. **Texts and stories.** Add `notifications.kinds.monthlyDigest`, `notifications.monthlyDigest` and `profile.notifications.digestOnlyOutside` in both locales. Stories: the notifications form with the digest ticked and with email off; the bell with a digest row.

## Tests

- **Unit:**
  - `MonthlyDigestTests`: the order of the movers; the kept percentage null without income; an empty month giving null; accounts needing attention counted from `checklist.accounts`.
  - `NotificationTextsTests`: the digest in English and Lithuanian, the Discord clip, and `Title` rendering month titles in the recipient's language.
  - A `JobUser` test: `ICurrentUser` resolves to the fixed user inside a `RunAsUserAsync` scope and to `HttpCurrentUser` outside one.
- **Integration** (`MonthlyDigestTests` in `Integration/Notifications`):
  - On 1 October, a user who ticked email gets one email and one bell row, with September's figures equal to `GET /api/month-close/2026-09` for that user.
  - A second pass that day, and a pass on 2 October, send nothing more.
  - A user who ticked nothing gets nothing, and a Discord-only user gets one Discord message.
  - The job runs as the member: another member's personal accounts are not in the figures, and the "Everything" scope is used even for a household member.
  - Nothing is sent on 6 October, or while `MonthClose` is off.
  - A member whose language is `lt` gets Lithuanian mail in an `en` installation, and a null language falls back to the installation's.
  - `PUT /api/users/me/language` with `de` answers 400 `enum.invalid`.
  - The existing `NotificationEmailTests` and `DiscordNotificationTests` pass unchanged with the language null.

## Docs

- A new `docs/features/monthly-digest.md`, with a diagram from the job through the review to the publisher and its three rows, and a row in `docs/features/README.md`.
- `docs/features/notifications.md`: the kind and its payload.
- `docs/features/email.md`: rewrite the Language section for the per-user language, and describe the digest mail under Notification emails.
- `docs/features/discord-notifications.md`: a row in the message-text table, and the language.
- `docs/features/background-jobs.md`: the job and the lock.
- `docs/architecture/background-jobs.md`: the job user scope.
- `docs/features/month-end-close.md`: say the digest reads the review.
- `docs/data-model.md` and `docs/api.md`.
- `docs/decisions/notifications.md`: a log entry for the digest.
- `docs/decisions/email.md`: a log entry for the per-user language, and an update to Current.
- `docs/backlog.md`: remove the Settings language row from section 2, and move the idea from section 4 to Done.

## Open questions

- The digest on the 1st arrives before most statements are imported, so its open items will usually be long. Should it wait until a later day, for example the 5th, or go out when the member closes the month?
- Should a member be able to receive a digest for a household scope as well, or is "Everything" enough?
