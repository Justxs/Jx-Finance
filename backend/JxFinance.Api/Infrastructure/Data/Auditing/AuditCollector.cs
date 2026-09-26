using System.Globalization;
using System.Text.Json;
using JxFinance.Common;
using JxFinance.Common.Formats;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Audit;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Conversions;
using JxFinance.Domain.Households;
using JxFinance.Domain.Investments;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Infrastructure.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace JxFinance.Infrastructure.Data.Auditing;

internal sealed class AuditCollector(AppDbContext db, Guid actorId, DateTimeOffset now)
{
    private const string TagsField = "tags";
    private const string SplitField = "split";
    private const string IdProperty = "Id";

    private static readonly Dictionary<Type, Audited> Registry = new[]
    {
        Audited.Of<Transaction>(
            AuditEntityKind.Transaction,
            Route.Scoped,
            (_, t) => TrashLabel.Dated(t.Description, t.Date, t.Amount),
            nameof(Transaction.Date), nameof(Transaction.Amount), nameof(Transaction.Type),
            nameof(Transaction.Description), nameof(Transaction.CategoryId), nameof(Transaction.AccountId)),
        Audited.Of<Transfer>(
            AuditEntityKind.Transfer,
            Route.Scoped,
            (_, t) => TrashLabel.Dated(t.Description, t.Date, t.Amount),
            nameof(Transfer.Date), nameof(Transfer.Amount), nameof(Transfer.ReceivedAmount),
            nameof(Transfer.FromAccountId), nameof(Transfer.ToAccountId), nameof(Transfer.Description)),
        Audited.Of<CurrencyConversion>(
            AuditEntityKind.Conversion,
            Route.Scoped,
            (_, c) => TrashLabel.Exchanged(c.FromAmount, c.ToAmount, c.Date),
            nameof(CurrencyConversion.Date), nameof(CurrencyConversion.FromAmount), nameof(CurrencyConversion.ToAmount),
            nameof(CurrencyConversion.Description), nameof(CurrencyConversion.AccountId)),
        Audited.Of<InvestmentTransaction>(
            AuditEntityKind.InvestmentTransaction,
            Route.Scoped,
            (collector, i) => TrashLabel.Investment(i, i.SecurityId is { } id ? collector.securities.GetValueOrDefault(id) : null),
            nameof(InvestmentTransaction.Date), nameof(InvestmentTransaction.Type), nameof(InvestmentTransaction.SecurityId),
            nameof(InvestmentTransaction.Quantity), nameof(InvestmentTransaction.Price), nameof(InvestmentTransaction.Fee),
            nameof(InvestmentTransaction.CashAmount), nameof(InvestmentTransaction.Description),
            nameof(InvestmentTransaction.AccountId)),
        Audited.Of<Account>(
            AuditEntityKind.Account,
            Route.Shareable,
            (_, a) => a.Name,
            nameof(Account.Name), nameof(Account.Description), nameof(Account.Type), nameof(Account.StartingBalance)),
        Audited.Of<Category>(
            AuditEntityKind.Category,
            Route.Shareable,
            (_, c) => c.Name,
            nameof(Category.Name), nameof(Category.Type), nameof(Category.Icon)),
        Audited.Of<Tag>(AuditEntityKind.Tag, Route.Shareable, (_, t) => t.Name, nameof(Tag.Name)),
        Audited.Of<Household>(AuditEntityKind.Household, Route.Household, (_, h) => h.Name, nameof(Household.Name)),
        Audited.Of<HouseholdMembership>(
            AuditEntityKind.Member,
            Route.Member,
            (collector, m) => collector.users.GetValueOrDefault(m.UserId) ?? "",
            nameof(HouseholdMembership.Role)),
        Audited.Of<TransactionAttachment>(
            AuditEntityKind.Attachment,
            Route.Attachment,
            (collector, a) => collector.attachedTo.TryGetValue(a.TransactionId, out var transaction)
                ? $"{a.FileName}, {transaction.Description}"
                : a.FileName),
    }.ToDictionary(a => a.Type);

    private readonly Dictionary<AccountId, AccountInfo> accounts = [];
    private readonly Dictionary<CategoryId, string> categories = [];
    private readonly Dictionary<TagId, string> tags = [];
    private readonly Dictionary<SecurityId, string> securities = [];
    private readonly Dictionary<Guid, string> users = [];
    private readonly Dictionary<TransactionId, List<TagId>> storedTags = [];
    private readonly Dictionary<TransactionId, List<LineInfo>> storedLines = [];
    private readonly Dictionary<TransactionId, AttachedTo> attachedTo = [];
    private readonly List<Draft> drafts = [];

    private ILookup<TransactionId, EntityEntry> tagChanges = Array.Empty<EntityEntry>().ToLookup(_ => default(TransactionId));
    private ILookup<TransactionId, EntityEntry> lineChanges = Array.Empty<EntityEntry>().ToLookup(_ => default(TransactionId));

    private enum Route
    {
        Scoped,
        Shareable,
        Household,
        Member,
        Attachment,
    }

    internal static IReadOnlyCollection<Type> AuditedTypes => Registry.Keys;

    public async Task<IReadOnlyList<AuditEvent>> CollectAsync(AuditSummary? summary, CancellationToken cancellationToken)
    {
        var entries = db.ChangeTracker.Entries()
            .Where(e => e.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .ToList();
        if (entries.Count == 0 && summary is null)
        {
            return [];
        }

        tagChanges = entries.Where(e => e.Entity is TransactionTag).ToLookup(e => ((TransactionTag)e.Entity).TransactionId);
        lineChanges = entries.Where(e => e.Entity is TransactionLine).ToLookup(e => ((TransactionLine)e.Entity).TransactionId);

        var scoped = ScopedEntries(entries);
        var attachments = entries.Where(e => RouteOf(e) == Route.Attachment).ToList();
        await LoadAttachedToAsync(attachments, cancellationToken);
        await LoadAccountsAsync(scoped, summary, cancellationToken);

        foreach (var entry in entries)
        {
            switch (RouteOf(entry))
            {
                case Route.Shareable:
                    AddShareable(entry);
                    break;
                case Route.Household:
                    AddHousehold(entry);
                    break;
                case Route.Member:
                    AddMember(entry, entries);
                    break;
            }
        }

        foreach (var entry in scoped)
        {
            AddScoped(entry);
        }

        foreach (var entry in attachments)
        {
            AddAttachment(entry);
        }

        return summary is null
            ? await DetailedAsync(cancellationToken)
            : Summarised(summary);
    }

    private List<EntityEntry> ScopedEntries(List<EntityEntry> entries)
    {
        var feeIds = db.ChangeTracker.Entries<CurrencyConversion>()
            .SelectMany(e => BothValues<TransactionId>(e, nameof(CurrencyConversion.FeeTransactionId)))
            .OfType<TransactionId>()
            .ToHashSet();
        var trackedTransactions = db.ChangeTracker.Entries<Transaction>()
            .ToDictionary(e => e.Entity.Id, e => (EntityEntry)e);
        var touchedByChildren = tagChanges.Select(g => g.Key)
            .Concat(lineChanges.Select(g => g.Key))
            .Distinct()
            .Select(id => trackedTransactions.GetValueOrDefault(id))
            .OfType<EntityEntry>();

        return
        [
            .. entries
                .Where(e => RouteOf(e) == Route.Scoped)
                .Concat(touchedByChildren)
                .DistinctBy(e => e.Entity, ReferenceEqualityComparer.Instance)
                .Where(e => e.Entity is not Transaction transaction || !feeIds.Contains(transaction.Id)),
        ];
    }

    private async Task LoadAccountsAsync(List<EntityEntry> scoped, AuditSummary? summary, CancellationToken cancellationToken)
    {
        var ids = scoped
            .SelectMany(e => AccountIds(e, true).Concat(AccountIds(e, false)))
            .Concat(summary?.Accounts ?? [])
            .Concat(attachedTo.Values.Select(t => t.AccountId))
            .Distinct()
            .ToList();
        var stored = ids.Count == 0
            ? []
            : await db.Accounts
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(a => ids.Contains(a.Id))
                .Select(a => new { a.Id, a.Scope, a.HouseholdId, a.Name })
                .ToListAsync(cancellationToken);
        var tracked = db.ChangeTracker.Entries<Account>()
            .Select(e => new { e.Entity.Id, e.Entity.Scope, e.Entity.HouseholdId, e.Entity.Name });
        foreach (var account in stored.Concat(tracked))
        {
            accounts[account.Id] = new AccountInfo(account.Scope, account.HouseholdId, account.Name);
        }
    }

    private static IEnumerable<AccountId> AccountIds(EntityEntry entry, bool original) => entry.Entity switch
    {
        Transfer =>
        [
            (AccountId)Read(entry, nameof(Transfer.FromAccountId), original)!,
            (AccountId)Read(entry, nameof(Transfer.ToAccountId), original)!,
        ],
        IAccountScoped => [(AccountId)Read(entry, nameof(IAccountScoped.AccountId), original)!],
        _ => [],
    };

    private HouseholdId? HouseholdOf(AccountId accountId) =>
        accounts.TryGetValue(accountId, out var account) && account.Scope == Scope.Shared ? account.HouseholdId : null;

    private void AddScoped(EntityEntry entry)
    {
        if (Lifecycle(entry) is not { } action)
        {
            return;
        }

        IEnumerable<AccountId> accountIds = action switch
        {
            AuditAction.Created or AuditAction.Restored => AccountIds(entry, false),
            AuditAction.Deleted => AccountIds(entry, true),
            _ => AccountIds(entry, true).Concat(AccountIds(entry, false)),
        };

        foreach (var household in accountIds.Select(HouseholdOf).OfType<HouseholdId>().Distinct())
        {
            drafts.Add(new Draft(household, action, KindOf(entry), IdOf(entry), entry));
        }
    }

    private async Task LoadAttachedToAsync(List<EntityEntry> attachments, CancellationToken cancellationToken)
    {
        var ids = attachments.Select(e => ((TransactionAttachment)e.Entity).TransactionId).Distinct().ToList();
        if (ids.Count == 0)
        {
            return;
        }

        var stored = await db.Transactions
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => ids.Contains(t.Id))
            .Select(t => new { t.Id, t.AccountId, t.Description, t.Date, t.Amount })
            .ToListAsync(cancellationToken);
        foreach (var transaction in stored)
        {
            attachedTo[transaction.Id] = new AttachedTo(
                transaction.AccountId,
                TrashLabel.Dated(transaction.Description, transaction.Date, transaction.Amount));
        }
    }

    private void AddAttachment(EntityEntry entry)
    {
        var attachment = (TransactionAttachment)entry.Entity;
        if (Lifecycle(entry) is not ({ } action and not AuditAction.Updated)
            || !attachedTo.TryGetValue(attachment.TransactionId, out var transaction)
            || HouseholdOf(transaction.AccountId) is not { } household)
        {
            return;
        }

        drafts.Add(new Draft(household, action, KindOf(entry), IdOf(entry), entry));
    }

    private void AddShareable(EntityEntry entry)
    {
        if (Lifecycle(entry) is not { } action)
        {
            return;
        }

        var before = SharedHousehold(entry, true);
        var after = SharedHousehold(entry, false);
        var kind = KindOf(entry);
        var id = IdOf(entry);
        switch (action)
        {
            case AuditAction.Created or AuditAction.Restored when after is { } household:
                drafts.Add(new Draft(household, action, kind, id, entry));
                break;
            case AuditAction.Deleted when before is { } household:
                drafts.Add(new Draft(household, action, kind, id, entry));
                break;
            case AuditAction.Updated when before != after:
                if (before is { } left)
                {
                    drafts.Add(new Draft(left, AuditAction.Unshared, kind, id, entry));
                }

                if (after is { } joined)
                {
                    drafts.Add(new Draft(joined, AuditAction.Shared, kind, id, entry));
                }

                break;
            case AuditAction.Updated when after is { } household:
                drafts.Add(new Draft(household, action, kind, id, entry));
                break;
        }
    }

    private void AddHousehold(EntityEntry entry)
    {
        if (Lifecycle(entry) is not { } action)
        {
            return;
        }

        drafts.Add(new Draft(
            ((Household)entry.Entity).Id,
            action == AuditAction.Updated ? AuditAction.Renamed : action,
            KindOf(entry),
            IdOf(entry),
            entry));
    }

    private void AddMember(EntityEntry entry, List<EntityEntry> entries)
    {
        var membership = (HouseholdMembership)entry.Entity;
        var action = Lifecycle(entry) switch
        {
            AuditAction.Created when entries.Any(e => e.State == EntityState.Added
                && e.Entity is Household household && household.Id == membership.HouseholdId) => (AuditAction?)null,
            AuditAction.Created or AuditAction.Restored => AuditAction.MemberAdded,
            AuditAction.Deleted => AuditAction.MemberRemoved,
            AuditAction.Updated => AuditAction.MemberRoleChanged,
            _ => null,
        };

        if (action is { } memberAction)
        {
            drafts.Add(new Draft(membership.HouseholdId, memberAction, KindOf(entry), membership.UserId, entry));
        }
    }

    private List<AuditEvent> Summarised(AuditSummary summary) =>
    [
        .. drafts.Select(d => d.Household)
            .Concat(summary.Accounts.Select(HouseholdOf).OfType<HouseholdId>())
            .Distinct()
            .Select(household => NewEvent(
                household,
                summary.Action,
                summary.Kind,
                summary.EntityId,
                summary.Description,
                summary.Count,
                [])),
    ];

    private async Task<List<AuditEvent>> DetailedAsync(CancellationToken cancellationToken)
    {
        if (drafts.Count == 0)
        {
            return [];
        }

        await LoadChildrenAsync(cancellationToken);
        await LoadNamesAsync(cancellationToken);

        var described = new Dictionary<object, (string Description, List<AuditChange> Changes)>(ReferenceEqualityComparer.Instance);
        var events = new List<AuditEvent>();
        foreach (var draft in drafts)
        {
            if (!described.TryGetValue(draft.Entry.Entity, out var detail))
            {
                detail = (Describe(draft.Entry), ChangesOf(draft));
                described[draft.Entry.Entity] = detail;
            }

            var carriesChanges = CarriesChanges(draft.Action);
            if (carriesChanges && detail.Changes.Count == 0)
            {
                continue;
            }

            events.Add(NewEvent(
                draft.Household,
                draft.Action,
                draft.Kind,
                draft.EntityId,
                detail.Description,
                null,
                carriesChanges ? detail.Changes : []));
        }

        return events;
    }

    private AuditEvent NewEvent(
        HouseholdId household,
        AuditAction action,
        AuditEntityKind kind,
        Guid? entityId,
        string description,
        int? count,
        List<AuditChange> changes) => new()
        {
            HouseholdId = household,
            ActorUserId = actorId,
            OccurredAt = now,
            Action = action,
            EntityKind = kind,
            EntityId = entityId,
            Description = TextLimit.Ellipsize(description, AuditEvent.DescriptionMaxLength),
            Count = count,
            Changes =
            [
                .. changes.Take(AuditEvent.MaxChanges).Select(c => c with
                {
                    From = TextLimit.Ellipsize(c.From, AuditEvent.ValueMaxLength),
                    To = TextLimit.Ellipsize(c.To, AuditEvent.ValueMaxLength),
                }),
            ],
        };

    private async Task LoadChildrenAsync(CancellationToken cancellationToken)
    {
        var transactionIds = drafts
            .Where(d => d.Action == AuditAction.Updated && d.Entry.Entity is Transaction)
            .Select(d => ((Transaction)d.Entry.Entity).Id)
            .Distinct()
            .ToList();
        await LoadStoredAsync(storedTags, tagChanges, transactionIds, async ids => (await db.TransactionTags
            .AsNoTracking()
            .Where(x => ids.Contains(x.TransactionId))
            .Select(x => new { x.TransactionId, x.TagId })
            .ToListAsync(cancellationToken))
            .ToLookup(p => p.TransactionId, p => p.TagId));
        await LoadStoredAsync(storedLines, lineChanges, transactionIds, async ids => (await db.TransactionLines
            .AsNoTracking()
            .Where(l => ids.Contains(l.TransactionId))
            .Select(l => new { l.TransactionId, l.Id, l.CategoryId, l.Amount })
            .ToListAsync(cancellationToken))
            .ToLookup(l => l.TransactionId, l => new LineInfo(l.Id, l.CategoryId, l.Amount.Amount)));
    }

    private static async Task LoadStoredAsync<TItem>(
        Dictionary<TransactionId, List<TItem>> stored,
        ILookup<TransactionId, EntityEntry> changes,
        List<TransactionId> transactionIds,
        Func<List<TransactionId>, Task<ILookup<TransactionId, TItem>>> load)
    {
        var ids = transactionIds.Where(id => changes.Contains(id)).ToList();
        if (ids.Count == 0)
        {
            return;
        }

        var items = await load(ids);
        foreach (var id in ids)
        {
            stored[id] = [.. items[id]];
        }
    }

    private async Task LoadNamesAsync(CancellationToken cancellationToken)
    {
        var entries = drafts.Select(d => d.Entry).DistinctBy(e => e.Entity, ReferenceEqualityComparer.Instance).ToList();

        var categoryIds = entries
            .Where(e => e.Entity is Transaction)
            .SelectMany(e => BothValues<CategoryId>(e, nameof(Transaction.CategoryId)))
            .Concat(storedLines.Values.SelectMany(lines => lines.Select(l => l.CategoryId)))
            .Concat(lineChanges.SelectMany(g => g).Select(e => ((TransactionLine)e.Entity).CategoryId))
            .OfType<CategoryId>()
            .Distinct()
            .ToList();
        await FillNamesAsync(
            categories,
            categoryIds,
            ids => db.Categories.IgnoreQueryFilters().AsNoTracking()
                .Where(c => ids.Contains(c.Id))
                .Select(c => new Named<CategoryId>(c.Id, c.Name)),
            db.ChangeTracker.Entries<Category>().Select(e => new Named<CategoryId>(e.Entity.Id, e.Entity.Name)),
            cancellationToken);

        var tagIds = storedTags.Values.SelectMany(ids => ids)
            .Concat(tagChanges.SelectMany(g => g).Select(e => ((TransactionTag)e.Entity).TagId))
            .Distinct()
            .ToList();
        await FillNamesAsync(
            tags,
            tagIds,
            ids => db.Tags.IgnoreQueryFilters().AsNoTracking()
                .Where(t => ids.Contains(t.Id))
                .Select(t => new Named<TagId>(t.Id, t.Name)),
            db.ChangeTracker.Entries<Tag>().Select(e => new Named<TagId>(e.Entity.Id, e.Entity.Name)),
            cancellationToken);

        var securityIds = entries
            .Where(e => e.Entity is InvestmentTransaction)
            .SelectMany(e => BothValues<SecurityId>(e, nameof(InvestmentTransaction.SecurityId)))
            .OfType<SecurityId>()
            .Distinct()
            .ToList();
        await FillNamesAsync(
            securities,
            securityIds,
            ids => db.Securities.IgnoreQueryFilters().AsNoTracking()
                .Where(s => ids.Contains(s.Id))
                .Select(s => new Named<SecurityId>(s.Id, s.Symbol)),
            db.ChangeTracker.Entries<Security>().Select(e => new Named<SecurityId>(e.Entity.Id, e.Entity.Symbol)),
            cancellationToken);

        var userIds = entries
            .Where(e => e.Entity is HouseholdMembership)
            .Select(e => ((HouseholdMembership)e.Entity).UserId)
            .Distinct()
            .ToList();
        await FillNamesAsync(
            users,
            userIds,
            ids => db.Users.AsNoTracking()
                .Where(u => ids.Contains(u.Id))
                .Select(u => new Named<Guid>(u.Id, AppUser.DisplayNameOrEmail(u.DisplayName, u.Email))),
            [],
            cancellationToken);
    }

    private static async Task FillNamesAsync<TKey>(
        Dictionary<TKey, string> names,
        List<TKey> ids,
        Func<List<TKey>, IQueryable<Named<TKey>>> stored,
        IEnumerable<Named<TKey>> tracked,
        CancellationToken cancellationToken)
        where TKey : notnull
    {
        if (ids.Count > 0)
        {
            foreach (var item in await stored(ids).ToListAsync(cancellationToken))
            {
                names[item.Id] = item.Name;
            }
        }

        foreach (var item in tracked)
        {
            names[item.Id] = item.Name;
        }
    }

    private string Describe(EntityEntry entry) => AuditedOf(entry)?.Describe(this, entry.Entity) ?? "";

    private List<AuditChange> ChangesOf(Draft draft)
    {
        var entry = draft.Entry;
        if (!CarriesChanges(draft.Action) || AuditedOf(entry) is not { } audited)
        {
            return [];
        }

        var changes = Diff(entry, audited.Fields);
        if (entry.Entity is Transaction transaction)
        {
            if (TagChange(transaction.Id) is { } tagChange)
            {
                changes.Add(tagChange);
            }

            if (LineChange(transaction.Id) is { } lineChange)
            {
                changes.Add(lineChange);
            }
        }

        return changes;
    }

    private List<AuditChange> Diff(EntityEntry entry, IEnumerable<string> fields)
    {
        var changes = new List<AuditChange>();
        foreach (var field in fields)
        {
            var before = Read(entry, field, true);
            var after = Read(entry, field, false);
            if (Equals(before, after))
            {
                continue;
            }

            var from = Display(before);
            var to = Display(after);
            if (from != to)
            {
                changes.Add(new AuditChange(FieldName(field), from, to));
            }
        }

        return changes;
    }

    private AuditChange? TagChange(TransactionId transactionId) => ChildChange(
        TagsField,
        storedTags.GetValueOrDefault(transactionId),
        tagChanges[transactionId],
        e => ((TransactionTag)e.Entity).TagId,
        id => id,
        TagNames);

    private AuditChange? LineChange(TransactionId transactionId) => ChildChange(
        SplitField,
        storedLines.GetValueOrDefault(transactionId),
        lineChanges[transactionId],
        e => LineInfo.Of((TransactionLine)e.Entity),
        line => line.Id,
        LineSummary);

    private static AuditChange? ChildChange<TItem, TKey>(
        string field,
        List<TItem>? stored,
        IEnumerable<EntityEntry> changed,
        Func<EntityEntry, TItem> itemOf,
        Func<TItem, TKey> keyOf,
        Func<IEnumerable<TItem>, string?> summarise)
    {
        if (stored is null)
        {
            return null;
        }

        var removed = changed.Where(e => e.State == EntityState.Deleted).Select(e => keyOf(itemOf(e))).ToHashSet();
        var added = changed.Where(e => e.State == EntityState.Added).Select(itemOf);
        var from = summarise(stored);
        var to = summarise(stored.Where(item => !removed.Contains(keyOf(item))).Concat(added).ToList());
        return from == to ? null : new AuditChange(field, from, to);
    }

    private string? TagNames(IEnumerable<TagId> ids)
    {
        var names = ids.Distinct().Select(id => tags.GetValueOrDefault(id) ?? "").Order(StringComparer.CurrentCultureIgnoreCase).ToList();
        return names.Count == 0 ? null : string.Join(", ", names);
    }

    private string? LineSummary(IEnumerable<LineInfo> lines)
    {
        var parts = lines
            .Select(l => $"{(l.CategoryId is { } id ? categories.GetValueOrDefault(id) : null) ?? "—"} "
                + l.Amount.ToString("0.00", CultureInfo.InvariantCulture))
            .Order(StringComparer.Ordinal)
            .ToList();
        return parts.Count == 0 ? null : string.Join("; ", parts);
    }

    private string? Display(object? value) => value switch
    {
        null => null,
        Money money => TrashLabel.Amount(money),
        DateOnly date => date.ToString(DateFormats.IsoDate, CultureInfo.InvariantCulture),
        decimal number => number.ToString("0.########", CultureInfo.InvariantCulture),
        AccountId id => accounts.TryGetValue(id, out var account) ? account.Name : null,
        CategoryId id => categories.GetValueOrDefault(id),
        SecurityId id => securities.GetValueOrDefault(id),
        Enum option => JsonNamingPolicy.CamelCase.ConvertName(option.ToString()),
        string text => string.IsNullOrWhiteSpace(text) ? null : text.Trim(),
        _ => Convert.ToString(value, CultureInfo.InvariantCulture),
    };

    private static string FieldName(string property)
    {
        var name = property.EndsWith("Id", StringComparison.Ordinal) ? property[..^2] : property;
        return JsonNamingPolicy.CamelCase.ConvertName(name);
    }

    private static bool CarriesChanges(AuditAction action) =>
        action is AuditAction.Updated or AuditAction.Renamed or AuditAction.MemberRoleChanged;

    private static AuditAction? Lifecycle(EntityEntry entry)
    {
        if (entry.State == EntityState.Added)
        {
            return AuditAction.Created;
        }

        var property = entry.Property(nameof(EntityBase.IsDeleted));
        var wasDeleted = (bool)property.OriginalValue!;
        var isDeleted = (bool)property.CurrentValue!;
        return (wasDeleted, isDeleted) switch
        {
            (false, true) => AuditAction.Deleted,
            (true, false) => AuditAction.Restored,
            (false, false) => AuditAction.Updated,
            _ => null,
        };
    }

    private static HouseholdId? SharedHousehold(EntityEntry entry, bool original) =>
        (Scope)Read(entry, nameof(IShareable.Scope), original)! == Scope.Shared
            ? (HouseholdId?)Read(entry, nameof(IShareable.HouseholdId), original)
            : null;

    private static IEnumerable<T?> BothValues<T>(EntityEntry entry, string name)
        where T : struct =>
        [(T?)Read(entry, name, true), (T?)Read(entry, name, false)];

    private static object? Read(EntityEntry entry, string name, bool original)
    {
        if (entry.Metadata.FindComplexProperty(name) is not null)
        {
            var complex = entry.ComplexProperty(name);
            var amount = (decimal)Pick(complex.Property(nameof(Money.Amount)), original)!;
            var currency = (Currency)Pick(complex.Property(nameof(Money.Currency)), original)!;
            return new Money(amount, currency);
        }

        return Pick(entry.Property(name), original);
    }

    private static object? Pick(PropertyEntry property, bool original) =>
        original ? property.OriginalValue : property.CurrentValue;

    private static Audited? AuditedOf(EntityEntry entry) => Registry.GetValueOrDefault(entry.Entity.GetType());

    private static Route? RouteOf(EntityEntry entry) => AuditedOf(entry)?.Route;

    private static AuditEntityKind KindOf(EntityEntry entry) => Registry[entry.Entity.GetType()].Kind;

    private static Guid IdOf(EntityEntry entry) => ((IStronglyTypedId)entry.Property(IdProperty).CurrentValue!).Value;

    private sealed record Audited(
        Type Type,
        AuditEntityKind Kind,
        Route Route,
        Func<AuditCollector, object, string> Describe,
        string[] Fields)
    {
        public static Audited Of<TEntity>(
            AuditEntityKind kind,
            Route route,
            Func<AuditCollector, TEntity, string> describe,
            params string[] fields) =>
            new(typeof(TEntity), kind, route, (collector, entity) => describe(collector, (TEntity)entity), fields);
    }

    private sealed record Named<TKey>(TKey Id, string Name);

    private sealed record Draft(HouseholdId Household, AuditAction Action, AuditEntityKind Kind, Guid EntityId, EntityEntry Entry);

    private sealed record AccountInfo(Scope Scope, HouseholdId? HouseholdId, string Name);

    private sealed record AttachedTo(AccountId AccountId, string Description);

    private sealed record LineInfo(Guid Id, CategoryId? CategoryId, decimal Amount)
    {
        public static LineInfo Of(TransactionLine line) => new(line.Id, line.CategoryId, line.Amount.Amount);
    }
}
