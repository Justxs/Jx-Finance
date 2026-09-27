# Households and sharing: decisions

Related: feature page [Households and sharing](../features/households-and-sharing.md); architecture [Sharing and households](../architecture/sharing.md).

## Current

### Sharing

Accounts, Categories and Tags only; record owner controls scope; account owner controls archiving; transfer changes require both accounts, and the new accounts as well when an edit moves it; a per-browser active household narrows the view to one household, defaults to everything, keeps personal records visible in every scope and never widens what a caller may see

### Member removal

Other owners' account histories disappear even if the removed member entered transactions; the removed member's own shared accounts and categories become personal again; personally owned records remain accessible

## Log

Newest first. Each entry is a choice between real alternatives: what was chosen, what was rejected, and why.

- **2026-09-21.** A file download started from a plain link carries the active household as an `activeHousehold` query parameter, read by `ActiveHouseholdMiddleware` on the three export routes only and put through the membership check the `X-Active-Household` header gets; a request that sends both must name the same household, and two different ones answer 400 `household.scopeMismatch`
  - Rejected: Fetching the CSV through the API client like the PDF, so the header carries it; letting the header win and ignoring the parameter, or the other way round; accepting the parameter on every route; a short-lived signed download token naming the scope
  - Why: Buffering the CSV through `fetchFile` would undo the 2026-09-19 decision that the CSV streams rows from the database while only the PDF is laid out in memory under a row cap, and a browser sends no header of its own with an `<a href>`, so the scope has to travel in the URL. Silently preferring one of two disagreeing values would produce exactly the defect being fixed — a file that does not match the screen — so a disagreement is a confused client and is refused. Restricting the parameter to the three download routes keeps one way in for every other route, and a token would be a second authorisation path for a value that only ever narrows a view the caller already has
- **2026-09-20.** The active household lives in the browser's `jx-preferences` row and travels as the `X-Active-Household` request header, which `ActiveHouseholdMiddleware` validates against the caller's memberships and drops when it cannot confirm it
  - Rejected: A column on `AspNetUsers` written through a new endpoint; a claim inside the session cookie; filtering per endpoint instead of in the query filter
  - Why: The scope is a view preference of one browser tab-set, the same kind of thing as the theme and the collapsed sidebar, which the 2026-09-19 decision already put in `jx-preferences`; a column would make two browsers of the same person fight over one value and would need a migration, an endpoint, backup and restore coverage and a rule for what a background job reads from it. A claim would need a new session on every switch. The header costs one membership check per request that carries it, which is an index lookup, and it is impossible to trust it by accident because nothing else reads it. Per-endpoint filtering was rejected outright: the next endpoint would forget it
- **2026-09-20.** The scope is applied inside `AppDbContext.ShareableFilter` as an extra conjunct, "personal, or the record's household is the active one", on top of the membership condition that was already there
  - Rejected: A second `IQueryable` extension every service calls; narrowing `HouseholdMemberships` itself so the existing filter follows
  - Why: One filter serves accounts and categories, and the `IAccountScoped` and transfer filters already ask whether the account is visible, so transactions, transfers, conversions and investment entries narrow for free and no endpoint can forget the scope. Narrowing the memberships would have been shorter, but it would hide the other households from `GET /api/households` as well, and the switcher would lose the way back to Everything. Keeping the membership condition intact is what makes the scope a narrowing and never a widening: a household the caller never joined is still invisible when they send its id. What still bypasses it is what already bypassed ownership — the `IgnoreQueryFilters()` call sites (category cleanup, import deduplication, the reporting-currency revaluation, the background jobs), raw SQL, backup and restore, and the CSV export link, which is a browser navigation and carries no header
- **2026-09-20.** A transfer whose two accounts sit in different households stays visible under either household's scope, and editing or deleting it answers 403 until the scope is Everything
  - Rejected: Hiding such a transfer unless both accounts are in the active scope; letting the edit through on the visible side alone
  - Why: Hiding it would make money leave an account for nowhere, and the balance shown for the visible account would stop adding up. The edit rule is not new: sharing already required both accounts for a mutation, and the scope only makes the second account invisible for a while, so the same 403 explains it
