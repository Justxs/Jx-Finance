# Notifications: decisions

Related: feature page [Notifications](../features/notifications.md); architecture [Background work and notifications](../architecture/background-jobs.md).

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-20.** A notification carries a typed `NotificationPayload` in a nullable `jsonb` column, and the mapper rebuilds a bill reminder's payload from the old `Message` text when the column is null
  - Rejected: Keeping the stringly-typed `Title` plus `Message` pair and parsing it per kind on the client; a column per kind; a data migration that rewrites the existing rows into the new shape
  - Why: The pair only worked because there was one kind: a second kind would have had to smuggle a percentage and a period through a sentence, which is exactly the parsing the client already had to do for the due date. A column per kind widens the table for every new producer. A rewrite would have to reparse text written by an older version to produce the same values the mapper can derive on read, with no way back if it got one wrong
- **2026-09-20.** Notifications are not behind a feature switch: the three routes stay out of `FeatureGateMiddleware`, and a row whose producing feature was switched off afterwards stays in the list and in the unread count, while its entry loses its link
  - Rejected: Gating `/api/notifications` on `RecurringBills` as it effectively was; hiding rows whose feature is off; deleting them when the switch flips
  - Why: Notifications are a shared mechanism, so gating them on one producer breaks every other producer. Hiding rows would make the badge jump when an administrator flips a switch and would force the list to know which feature each kind belongs to, and deleting them destroys a record of something that was true. Dropping the link is enough, because the page it opens is not in the navigation either
