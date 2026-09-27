# Plans

A plan is written before a feature is built: the outcome, the design, the steps and the docs it will touch. Once the feature ships, its page under [features](../features/README.md) describes what exists and the plan stays as the record of intent; where the two disagree, the feature page and the code win.

| Plan | Status | Shipped as |
| --- | --- | --- |
| [Discord notifications](discord-notifications.md) | Planned 2026-09-25, size M; build first | |
| [Unusual-amount flags and subscription price rises](unusual-amounts.md) | Planned 2026-09-25, size M; after Discord notifications | |
| [Month-end close](month-end-close.md) | Planned 2026-09-25, size M; after the two above | |

A new plan is a kebab-case file here, starting with `# Plan: <name>` and a `Status:` line, and gets a row in this table. When it ships, change its row and add an "Implemented" line under the plan's title.
