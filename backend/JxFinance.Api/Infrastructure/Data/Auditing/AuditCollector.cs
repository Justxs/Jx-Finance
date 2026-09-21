using System.Globalization;
using System.Text.Json;
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
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace JxFinance.Infrastructure.Data.Auditing;

internal sealed class AuditCollector(AppDbContext db, Guid actorId, DateTimeOffset now)
{
    private const string TagsField = "tags";
    private const string SplitField = "split";

    private static readonly Dictionary<Type, string[]> Fields = new()
    {
        [typeof(Transaction)] =
        [
            nameof(Transaction.Date), nameof(Transaction.Amount), nameof(Transaction.Type),
            nameof(Transaction.Description), nameof(Transaction.CategoryId), nameof(Transaction.AccountId),
        ],
        [typeof(Transfer)] =
        [
            nameof(Transfer.Date), nameof(Transfer.Amount), nameof(Transfer.ReceivedAmount),
            nameof(Transfer.FromAccountId), nameof(Transfer.ToAccountId), nameof(Transfer.Description),
        ],
        [typeof(CurrencyConversion)] =
        [
            nameof(CurrencyConversion.Date), nameof(CurrencyConversion.FromAmount), nameof(CurrencyConversion.ToAmount),
            nameof(CurrencyConversion.Description), nameof(CurrencyConversion.AccountId),
        ],
        [typeof(InvestmentTransaction)] =
        [
            nameof(InvestmentTransaction.Date), nameof(InvestmentTransaction.Type), nameof(InvestmentTransaction.SecurityId),
            nameof(InvestmentTransaction.Quantity), nameof(InvestmentTransaction.Price), nameof(InvestmentTransaction.Fee),
            nameof(InvestmentTransaction.CashAmount), nameof(InvestmentTransaction.Description),
            nameof(InvestmentTransaction.AccountId),
        ],
        [typeof(Account)] =
        [
            nameof(Account.Name), nameof(Account.Description), nameof(Account.Type), nameof(Account.StartingBalance),
        ],
        [typeof(Category)] = [nameof(Category.Name), nameof(Category.Type), nameof(Category.Icon)],
        [typeof(Tag)] = [nameof(Tag.Name)],
    };

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
        var attachments = entries.Where(e => e.Entity is TransactionAttachment).ToList();
        await LoadAttachedToAsync(attachments, cancellationToken);
        await LoadAccountsAsync(scoped, summary, cancellationToken);

        foreach (var entry in entries)
        {
            switch (entry.Entity)
            {
                case Account:
                    AddShareable(entry, AuditEntityKind.Account);
                    break;
                case Category:
                    AddShareable(entry, AuditEntityKind.Category);
                    break;
                case Tag:
                    AddShareable(entry, AuditEntityKind.Tag);
                    break;
                case Household:
                    AddHousehold(entry);
                    break;
                case HouseholdMembership:
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
            .SelectMany(e => new[] { (TransactionId?)Read(e, nameof(CurrencyConversion.FeeTransactionId), true), e.Entity.FeeTransactionId })
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
                .Where(e => e.Entity is Transaction or Transfer or CurrencyConversion or InvestmentTransaction)
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
        if (ids.Count > 0)
        {
            var stored = await db.Accounts
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(a => ids.Contains(a.Id))
                .Select(a => new { a.Id, a.Scope, a.HouseholdId, a.Name })
                .ToListAsync(cancellationToken);
            foreach (var account in stored)
            {
                accounts[account.Id] = new AccountInfo(account.Scope, account.HouseholdId, account.Name);
            }
        }

        foreach (var entry in db.ChangeTracker.Entries<Account>())
        {
            var account = entry.Entity;
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

        drafts.Add(new Draft(household, action, AuditEntityKind.Attachment, attachment.Id.Value, entry));
    }

    private void AddShareable(EntityEntry entry, AuditEntityKind kind)
    {
        if (Lifecycle(entry) is not { } action)
        {
            return;
        }

        var before = SharedHousehold(entry, true);
        var after = SharedHousehold(entry, false);
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

        var household = ((Household)entry.Entity).Id;
        drafts.Add(new Draft(
            household,
            action == AuditAction.Updated ? AuditAction.Renamed : action,
            AuditEntityKind.Household,
            household.Value,
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
            drafts.Add(new Draft(membership.HouseholdId, memberAction, AuditEntityKind.Member, membership.UserId, entry));
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

            if (draft.Action is AuditAction.Updated or AuditAction.Renamed or AuditAction.MemberRoleChanged
                && detail.Changes.Count == 0)
            {
                continue;
            }

            var changes = draft.Action is AuditAction.Updated or AuditAction.Renamed or AuditAction.MemberRoleChanged
                ? detail.Changes
                : [];
            events.Add(NewEvent(draft.Household, draft.Action, draft.Kind, draft.EntityId, detail.Description, null, changes));
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
            Description = Shorten(description, AuditEvent.DescriptionMaxLength) ?? "",
            Count = count,
            Changes =
            [
                .. changes.Take(AuditEvent.MaxChanges).Select(c => c with
                {
                    From = Shorten(c.From, AuditEvent.ValueMaxLength),
                    To = Shorten(c.To, AuditEvent.ValueMaxLength),
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
        var withTags = transactionIds.Where(id => tagChanges.Contains(id)).ToList();
        if (withTags.Count > 0)
        {
            var pairs = await db.TransactionTags
                .AsNoTracking()
                .Where(x => withTags.Contains(x.TransactionId))
                .Select(x => new { x.TransactionId, x.TagId })
                .ToListAsync(cancellationToken);
            foreach (var id in withTags)
            {
                storedTags[id] = [.. pairs.Where(p => p.TransactionId == id).Select(p => p.TagId)];
            }
        }

        var withLines = transactionIds.Where(id => lineChanges.Contains(id)).ToList();
        if (withLines.Count > 0)
        {
            var lines = await db.TransactionLines
                .AsNoTracking()
                .Where(l => withLines.Contains(l.TransactionId))
                .Select(l => new { l.TransactionId, l.Id, l.CategoryId, l.Amount })
                .ToListAsync(cancellationToken);
            foreach (var id in withLines)
            {
                storedLines[id] =
                [
                    .. lines.Where(l => l.TransactionId == id).Select(l => new LineInfo(l.Id, l.CategoryId, l.Amount.Amount)),
                ];
            }
        }
    }

    private async Task LoadNamesAsync(CancellationToken cancellationToken)
    {
        var entries = drafts.Select(d => d.Entry).DistinctBy(e => e.Entity, ReferenceEqualityComparer.Instance).ToList();

        var categoryIds = entries
            .Where(e => e.Entity is Transaction)
            .SelectMany(e => new[]
            {
                (CategoryId?)Read(e, nameof(Transaction.CategoryId), true),
                (CategoryId?)Read(e, nameof(Transaction.CategoryId), false),
            })
            .Concat(storedLines.Values.SelectMany(lines => lines.Select(l => l.CategoryId)))
            .Concat(lineChanges.SelectMany(g => g).Select(e => ((TransactionLine)e.Entity).CategoryId))
            .OfType<CategoryId>()
            .Distinct()
            .ToList();
        if (categoryIds.Count > 0)
        {
            foreach (var category in await db.Categories.IgnoreQueryFilters().AsNoTracking()
                .Where(c => categoryIds.Contains(c.Id))
                .Select(c => new { c.Id, c.Name })
                .ToListAsync(cancellationToken))
            {
                categories[category.Id] = category.Name;
            }
        }

        var tagIds = storedTags.Values.SelectMany(ids => ids)
            .Concat(tagChanges.SelectMany(g => g).Select(e => ((TransactionTag)e.Entity).TagId))
            .Distinct()
            .ToList();
        if (tagIds.Count > 0)
        {
            foreach (var tag in await db.Tags.IgnoreQueryFilters().AsNoTracking()
                .Where(t => tagIds.Contains(t.Id))
                .Select(t => new { t.Id, t.Name })
                .ToListAsync(cancellationToken))
            {
                tags[tag.Id] = tag.Name;
            }
        }

        var securityIds = entries
            .Where(e => e.Entity is InvestmentTransaction)
            .SelectMany(e => new[]
            {
                (SecurityId?)Read(e, nameof(InvestmentTransaction.SecurityId), true),
                (SecurityId?)Read(e, nameof(InvestmentTransaction.SecurityId), false),
            })
            .OfType<SecurityId>()
            .Distinct()
            .ToList();
        if (securityIds.Count > 0)
        {
            foreach (var security in await db.Securities.IgnoreQueryFilters().AsNoTracking()
                .Where(s => securityIds.Contains(s.Id))
                .Select(s => new { s.Id, s.Symbol })
                .ToListAsync(cancellationToken))
            {
                securities[security.Id] = security.Symbol;
            }
        }

        var userIds = entries
            .Where(e => e.Entity is HouseholdMembership)
            .Select(e => ((HouseholdMembership)e.Entity).UserId)
            .Distinct()
            .ToList();
        if (userIds.Count > 0)
        {
            foreach (var user in await db.Users.AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .Select(u => new { u.Id, u.DisplayName, u.Email })
                .ToListAsync(cancellationToken))
            {
                users[user.Id] = string.IsNullOrWhiteSpace(user.DisplayName) ? user.Email ?? "" : user.DisplayName;
            }
        }

        foreach (var entry in db.ChangeTracker.Entries<Category>())
        {
            categories[entry.Entity.Id] = entry.Entity.Name;
        }

        foreach (var entry in db.ChangeTracker.Entries<Tag>())
        {
            tags[entry.Entity.Id] = entry.Entity.Name;
        }

        foreach (var entry in db.ChangeTracker.Entries<Security>())
        {
            securities[entry.Entity.Id] = entry.Entity.Symbol;
        }
    }

    private string Describe(EntityEntry entry) => entry.Entity switch
    {
        Transaction t => TrashLabel.Dated(t.Description, t.Date, t.Amount),
        Transfer t => TrashLabel.Dated(t.Description, t.Date, t.Amount),
        CurrencyConversion c => TrashLabel.Exchanged(c.FromAmount, c.ToAmount, c.Date),
        InvestmentTransaction i => TrashLabel.Investment(i, i.SecurityId is { } id ? securities.GetValueOrDefault(id) : null),
        Account a => a.Name,
        Category c => c.Name,
        Tag t => t.Name,
        Household h => h.Name,
        TransactionAttachment a => attachedTo.TryGetValue(a.TransactionId, out var transaction)
            ? $"{a.FileName}, {transaction.Description}"
            : a.FileName,
        HouseholdMembership m => users.GetValueOrDefault(m.UserId) ?? "",
        _ => "",
    };

    private List<AuditChange> ChangesOf(Draft draft)
    {
        var entry = draft.Entry;
        switch (entry.Entity)
        {
            case Household:
                return Diff(entry, [nameof(Household.Name)]);
            case HouseholdMembership:
                return Diff(entry, [nameof(HouseholdMembership.Role)]);
        }

        if (draft.Action != AuditAction.Updated || !Fields.TryGetValue(entry.Entity.GetType(), out var fields))
        {
            return [];
        }

        var changes = Diff(entry, fields);
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

    private AuditChange? TagChange(TransactionId transactionId)
    {
        if (!storedTags.TryGetValue(transactionId, out var stored))
        {
            return null;
        }

        var removed = tagChanges[transactionId].Where(e => e.State == EntityState.Deleted)
            .Select(e => ((TransactionTag)e.Entity).TagId)
            .ToHashSet();
        var added = tagChanges[transactionId].Where(e => e.State == EntityState.Added)
            .Select(e => ((TransactionTag)e.Entity).TagId);
        var after = stored.Where(id => !removed.Contains(id)).Concat(added).Distinct().ToList();

        var from = TagNames(stored);
        var to = TagNames(after);
        return from == to ? null : new AuditChange(TagsField, from, to);
    }

    private string? TagNames(IEnumerable<TagId> ids)
    {
        var names = ids.Select(id => tags.GetValueOrDefault(id) ?? "").Order(StringComparer.CurrentCultureIgnoreCase).ToList();
        return names.Count == 0 ? null : string.Join(", ", names);
    }

    private AuditChange? LineChange(TransactionId transactionId)
    {
        if (!storedLines.TryGetValue(transactionId, out var stored))
        {
            return null;
        }

        var removed = lineChanges[transactionId].Where(e => e.State == EntityState.Deleted)
            .Select(e => ((TransactionLine)e.Entity).Id)
            .ToHashSet();
        var added = lineChanges[transactionId].Where(e => e.State == EntityState.Added)
            .Select(e => (TransactionLine)e.Entity)
            .Select(l => new LineInfo(l.Id, l.CategoryId, l.Amount.Amount));
        var after = stored.Where(l => !removed.Contains(l.Id)).Concat(added).ToList();

        var from = LineSummary(stored);
        var to = LineSummary(after);
        return from == to ? null : new AuditChange(SplitField, from, to);
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
        DateOnly date => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
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

    private static string? Shorten(string? text, int maxLength)
    {
        if (text is null)
        {
            return null;
        }

        var trimmed = text.Trim();
        return trimmed.Length <= maxLength ? trimmed : trimmed[..(maxLength - 1)] + "…";
    }

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

    private static AuditEntityKind KindOf(EntityEntry entry) => entry.Entity switch
    {
        Transfer => AuditEntityKind.Transfer,
        CurrencyConversion => AuditEntityKind.Conversion,
        InvestmentTransaction => AuditEntityKind.InvestmentTransaction,
        _ => AuditEntityKind.Transaction,
    };

    private static Guid IdOf(EntityEntry entry) => entry.Entity switch
    {
        Transaction t => t.Id.Value,
        Transfer t => t.Id.Value,
        CurrencyConversion c => c.Id.Value,
        InvestmentTransaction i => i.Id.Value,
        Account a => a.Id.Value,
        Category c => c.Id.Value,
        Tag t => t.Id.Value,
        _ => Guid.Empty,
    };

    private sealed record Draft(HouseholdId Household, AuditAction Action, AuditEntityKind Kind, Guid EntityId, EntityEntry Entry);

    private sealed record AccountInfo(Scope Scope, HouseholdId? HouseholdId, string Name);

    private sealed record AttachedTo(AccountId AccountId, string Description);

    private sealed record LineInfo(Guid Id, CategoryId? CategoryId, decimal Amount);
}
