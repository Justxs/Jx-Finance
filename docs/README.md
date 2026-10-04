# Jx Finance documentation

These pages describe what the current code does, not a wishlist, and not how it is laid out: they name a class or file only where a reader needs an entry point, so a rename or a split needs no doc change. Where a page and the code disagree, the code is right and the page needs fixing. Diagrams are Mermaid: they render in Gitea and GitHub, and in the VS Code Markdown preview with a Mermaid extension. The top-level UML views in [System diagrams](architecture/diagrams.md) are PlantUML, committed with their rendered SVGs. Installation and commands are in the [repository README](../README.md); rules for coding agents are in [AGENTS.md](../AGENTS.md).

## Where to look

| Question | Page |
| --- | --- |
| What is the product and who is it for? | [Overview](overview.md), [PRODUCT.md](../PRODUCT.md) |
| What does feature X do, and where is its code? | [Feature walkthrough](features/README.md), then `features/<feature>.md` |
| What is in scope, what is deliberately left out? | [Features and scope](scope.md) |
| How does a user get something done? | [User flows](user-flows.md) |
| Which entities and money rules exist? | [Data model](data-model.md) |
| How is an endpoint written, which routes exist, what does an error look like? | [API surface](api.md) |
| How does mechanism Y work, and why is it built that way? | [Architecture](architecture/README.md), then `architecture/<area>.md` |
| What was decided about Z, and what was rejected? | [Decisions](decisions/README.md), then `decisions/<topic>.md` |
| How do I add a feature end to end? | [Adding a feature](adding-a-feature.md) |
| Which libraries, tools and lint rules are in use? | [Technology and development](tech-stack.md), [Resources](resources.md) |
| What does the interface look like? | [DESIGN.md](../DESIGN.md), [Visual system](architecture/visual-system.md) |
| What must always hold (exactness, isolation, privacy)? | [Quality requirements](quality-requirements.md) |
| What is not built yet? | [Backlog and ideas](backlog.md), [Plans](plans/README.md) |
| What has been verified, and when? | [Verification](verification.md), [Release checklist](release-checklist.md) |

## Layout

- `features/`: one page per feature, with its behaviour and diagrams. `README.md` is the table of all of them and the one place that names each feature's backend folder, frontend folder and switch.
- `architecture/`: prose on how things work, one page per area.
- `decisions/`: one page per topic, each with the standing decision and a dated log of choices and rejected alternatives.
- `plans/`: designs for features not built yet, deleted once the feature ships.
- The top-level pages cover the whole product.

File names are lowercase kebab-case without numbers, so that paths stay stable and need no quoting. `just check-docs` checks every link and heading anchor, that the code paths and type names these pages and AGENTS.md put in backticks still exist, that the route list in [API surface](api.md#routes) matches the contract, and that the components, paths, CSS variables and frontmatter colors named in [DESIGN.md](../DESIGN.md) still match the code ([Developer tooling](architecture/developer-tooling.md)).
