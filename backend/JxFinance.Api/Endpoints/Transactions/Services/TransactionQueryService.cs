using System.Runtime.CompilerServices;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Common.Subscriptions;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Transactions.ExportTransactions;
using JxFinance.Endpoints.Transactions.GetLedger;
using JxFinance.Endpoints.Transactions.GetTransactions;
using JxFinance.Endpoints.Transactions.GetTransactionsSummary;
using JxFinance.Endpoints.Transactions.Interfaces;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JxFinance.Endpoints.Transactions.Services;

[RegisterService<ITransactionQueryService>(LifeTime.Scoped)]
public sealed class TransactionQueryService(
    AppDbContext db,
    ICurrentUser currentUser,
    IInstanceSettingsStore settings,
    IOptions<AppOptions> options) : ITransactionQueryService
{
    public async Task<PagedResponse<TransactionResponse>> GetPageAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var page = await Filtered(request)
            .AsNoTracking()
            .ToPageAsync(request, query => Sorted(query, request), cancellationToken);

        return page.Map(await ResponderAsync(page.Items, request.Search, cancellationToken));
    }

    public async Task<PagedResponse<LedgerItemResponse>> GetLedgerPageAsync(
        GetLedgerRequest request,
        CancellationToken cancellationToken)
    {
        var filtered = Filtered(request);
        var sort = request.Sort ?? TransactionSortField.Date;
        var descending = (request.Direction ?? SortDirection.Desc) == SortDirection.Desc;
        var page = await LedgerKeys.Of(db, filtered, sort)
            .ToPageAsync(request, keys => LedgerKeys.Sorted(keys, sort, descending), cancellationToken);

        var transactionIds = page.Items
            .Where(k => k.Kind == LedgerItemKind.Transaction)
            .Select(k => new TransactionId(k.Id))
            .ToList();
        var transactions = transactionIds.Count == 0
            ? []
            : await db.Transactions.AsNoTracking().Where(t => transactionIds.Contains(t.Id)).ToListAsync(cancellationToken);
        var respond = await ResponderAsync(transactions, request.Search, cancellationToken);
        var responses = transactions.ToDictionary(t => t.Id.Value, respond);
        var groups = await GroupSummariesAsync(
            filtered,
            page.Items.Where(k => k.Kind == LedgerItemKind.Group).Select(k => new TransactionGroupId(k.Id)).ToList(),
            cancellationToken);

        return page.Map(k => k.Kind == LedgerItemKind.Group
            ? new LedgerItemResponse(LedgerItemKind.Group, null, groups[k.Id])
            : new LedgerItemResponse(LedgerItemKind.Transaction, responses[k.Id], null));
    }

    public async Task<IReadOnlyList<TransactionResponse>> ListGroupMembersAsync(
        TransactionGroupId groupId,
        TransactionFilterRequest filter,
        int limit,
        CancellationToken cancellationToken)
    {
        var members = await Filtered(filter)
            .Where(t => t.GroupId == groupId)
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .AsNoTracking()
            .Take(limit)
            .ToListAsync(cancellationToken);
        var respond = await ResponderAsync(members, filter.Search, cancellationToken);

        return members.Select(respond).ToList();
    }

    public async Task<IReadOnlyList<TransactionResponse>> ListUncategorizedAsync(
        TransactionFilterRequest filter,
        int limit,
        CancellationToken cancellationToken)
    {
        var rows = await Filtered(filter)
            .Where(t => !t.IsSplit && t.CategoryId == null)
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .AsNoTracking()
            .Take(limit)
            .ToListAsync(cancellationToken);
        var respond = await ResponderAsync(rows, filter.Search, cancellationToken);

        return rows.Select(respond).ToList();
    }

    private async Task<Dictionary<Guid, TransactionGroupSummary>> GroupSummariesAsync(
        IQueryable<Transaction> filtered,
        List<TransactionGroupId> ids,
        CancellationToken cancellationToken)
    {
        if (ids.Count == 0)
        {
            return [];
        }

        var groups = await db.TransactionGroups
            .Where(g => ids.Contains(g.Id))
            .Select(g => new
            {
                g.Id,
                g.Name,
                g.Scope,
                g.HouseholdId,
                Members = db.Transactions.Count(t => t.GroupId == g.Id),
                Matching = filtered.Count(t => t.GroupId == g.Id),
                First = filtered.Where(t => t.GroupId == g.Id).Min(t => (DateOnly?)t.Date),
                Last = filtered.Where(t => t.GroupId == g.Id).Max(t => (DateOnly?)t.Date),
                Net = filtered
                    .Where(t => t.GroupId == g.Id)
                    .Sum(t => t.Type == FlowType.Income ? t.ReportingAmount : -t.ReportingAmount),
            })
            .ToListAsync(cancellationToken);

        return groups.ToDictionary(
            g => g.Id.Value,
            g => new TransactionGroupSummary(
                g.Id.Value,
                g.Name,
                g.First ?? default,
                g.Last ?? default,
                g.Members,
                g.Matching,
                Money.Round(g.Net),
                g.Scope,
                g.HouseholdId?.Value));
    }

    public async Task<ExportNames> ExportNamesAsync(CancellationToken cancellationToken) => new(
        await db.Accounts.Select(a => new { a.Id, a.Name }).ToDictionaryAsync(a => a.Id.Value, a => a.Name, cancellationToken),
        await db.Categories.Select(c => new { c.Id, c.Name }).ToDictionaryAsync(c => c.Id.Value, c => c.Name, cancellationToken),
        await db.Tags.Select(t => new { t.Id, t.Name }).ToDictionaryAsync(t => t.Id.Value, t => t.Name, cancellationToken),
        await db.TransactionGroups.Select(g => new { g.Id, g.Name }).ToDictionaryAsync(g => g.Id.Value, g => g.Name, cancellationToken));

    public async IAsyncEnumerable<TransactionResponse> StreamExportAsync(
        GetTransactionsRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var tagsByTransaction = await LoadTagsOfFilteredAsync(request, cancellationToken);

        var rows = Sorted(Filtered(request), request)
            .AsNoTracking()
            .AsAsyncEnumerable()
            .WithCancellation(cancellationToken);

        await foreach (var transaction in rows)
        {
            yield return settings.Placed(transaction.ToResponse(null, tagsByTransaction.GetValueOrDefault(transaction.Id)));
        }
    }

    public async Task<Result<IReadOnlyList<TransactionResponse>>> ExportForPdfAsync(
        GetTransactionsRequest request,
        CancellationToken cancellationToken)
    {
        var limit = options.Value.PdfExportMaxRows;
        var items = await Sorted(Filtered(request), request)
            .AsNoTracking()
            .Take(limit + 1)
            .ToListAsync(cancellationToken);
        if (items.Count > limit)
        {
            return new DomainError(
                ErrorCodes.ExportTooManyRows,
                $"A PDF holds at most {limit} transactions. Narrow the filters, or export CSV instead.");
        }

        var tagsByTransaction = await TransactionResponses.LoadTagsAsync(db, items.Select(t => t.Id), cancellationToken);

        return items.Select(t => settings.Placed(t.ToResponse(null, tagsByTransaction.GetValueOrDefault(t.Id)))).ToList();
    }

    public async Task<TransactionsSummaryResponse> GetSummaryAsync(
        GetTransactionsSummaryRequest request,
        CancellationToken cancellationToken)
    {
        var totals = await Filtered(request)
            .GroupBy(t => 1)
            .Select(g => new
            {
                Count = g.Count(),
                Income = g.Sum(t => t.Type == FlowType.Income ? t.ReportingAmount : 0m),
                Expense = g.Sum(t => t.Type == FlowType.Expense ? t.ReportingAmount : 0m),
            })
            .SingleOrDefaultAsync(cancellationToken);

        return new TransactionsSummaryResponse(
            totals?.Count ?? 0,
            totals?.Income ?? 0m,
            totals?.Expense ?? 0m);
    }

    public async Task<Result<TransactionResponse>> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var transactionId = new TransactionId(id);
        if (await TransactionResponses.FindAsync(db, transactionId, cancellationToken) is not { } transaction)
        {
            return TransactionResponses.NotFound;
        }

        return await TransactionResponses.ResponseAsync(db, currentUser, settings, transaction, cancellationToken);
    }

    private IOrderedQueryable<Transaction> Sorted(IQueryable<Transaction> query, GetTransactionsRequest request)
    {
        var descending = (request.Direction ?? SortDirection.Desc) == SortDirection.Desc;

        return (request.Sort ?? TransactionSortField.Date) switch
        {
            TransactionSortField.Description => Order(query, t => t.Description, descending),
            TransactionSortField.Category => Order(
                query,
                t => db.Categories.Where(c => c.Id == t.CategoryId).Select(c => c.Name).FirstOrDefault(),
                descending),
            TransactionSortField.Account => Order(
                query,
                t => db.Accounts.Where(a => a.Id == t.AccountId).Select(a => a.Name).FirstOrDefault(),
                descending),
            TransactionSortField.Amount => Order(query, t => t.ReportingAmount, descending),
            _ => descending
                ? query.OrderByDescending(t => t.Date).ThenByDescending(t => t.CreatedAt)
                : query.OrderBy(t => t.Date).ThenBy(t => t.CreatedAt),
        };
    }

    private static IOrderedQueryable<Transaction> Order<TKey>(
        IQueryable<Transaction> query,
        System.Linq.Expressions.Expression<Func<Transaction, TKey>> key,
        bool descending) =>
        descending
            ? query.OrderByDescending(key).ThenByDescending(t => t.CreatedAt)
            : query.OrderBy(key).ThenByDescending(t => t.CreatedAt);

    private IQueryable<Transaction> Filtered(TransactionFilterRequest request)
    {
        var query = db.Transactions.AsQueryable();
        if (request.AccountId is { } accountId)
        {
            var typedAccountId = new AccountId(accountId);
            query = query.Where(t => t.AccountId == typedAccountId);
        }

        if (request.CategoryId is { } categoryId)
        {
            var typedCategoryId = new CategoryId(categoryId);
            query = query.Where(t => t.CategoryId == typedCategoryId
                || db.Categories.Any(c => c.Id == t.CategoryId && c.ParentId == typedCategoryId)
                || (t.IsSplit && db.TransactionLines.Any(l => l.TransactionId == t.Id
                    && (l.CategoryId == typedCategoryId
                        || db.Categories.Any(c => c.Id == l.CategoryId && c.ParentId == typedCategoryId)))));
        }

        foreach (var tagId in GuidList.Parse(request.TagIds))
        {
            var typedTagId = new TagId(tagId);
            query = query.Where(t => db.TransactionTags.Any(x => x.TransactionId == t.Id && x.TagId == typedTagId));
        }

        if (request.Type is { } type)
        {
            query = query.Where(t => t.Type == type);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var pattern = LikePattern.Contains(request.Search);
            var searchesPlace = settings.LocationsEnabled();
            var searchesReceipts = settings.ReceiptItemsEnabled();
            var searchesNames = settings.PayeeNamesEnabled();
            var receiptFiles = ReceiptItemSearch.MatchingFiles(db, currentUser.Id, request.Search);
            query = query.Where(t =>
                (t.Description != null && EF.Functions.ILike(t.Description, pattern, LikePattern.Escape))
                || (t.Note != null && EF.Functions.ILike(t.Note, pattern, LikePattern.Escape))
                || (t.Payee != null && EF.Functions.ILike(t.Payee, pattern, LikePattern.Escape))
                || (searchesPlace && t.Place != null && EF.Functions.ILike(t.Place, pattern, LikePattern.Escape))
                || (searchesNames && db.PayeeNames.Any(p => p.PayeeKey == t.PayeeKey && EF.Functions.ILike(p.Name, pattern, LikePattern.Escape)))
                || (searchesReceipts && db.TransactionAttachments.Any(a => a.TransactionId == t.Id && receiptFiles.Contains(a.Sha256))));
        }

        if (!string.IsNullOrWhiteSpace(request.Place) && settings.LocationsEnabled())
        {
            var placePattern = LikePattern.Contains(request.Place.Trim());
            query = query.Where(t => t.Place != null && EF.Functions.ILike(t.Place, placePattern, LikePattern.Escape));
        }

        if (SubscriptionDescription.Normalize(request.Payee) is { Length: > 0 } payeeKey)
        {
            query = query.Where(t => t.PayeeKey == payeeKey);
        }

        if (request is { SpreadOverlap: true, DateFrom: { } from, DateTo: { } to })
        {
            query = query.Where(t => (t.Date >= from && t.Date <= to)
                || (t.SpreadMonths != null && t.SpreadFrom <= to && t.SpreadUntil >= from));
        }
        else
        {
            if (request.DateFrom is { } dateFrom)
            {
                query = query.Where(t => t.Date >= dateFrom);
            }

            if (request.DateTo is { } dateTo)
            {
                query = query.Where(t => t.Date <= dateTo);
            }
        }

        if (request.AmountMin is { } amountMin)
        {
            query = query.Where(t => Math.Abs(t.Amount.Amount) >= amountMin);
        }

        if (request.AmountMax is { } amountMax)
        {
            query = query.Where(t => Math.Abs(t.Amount.Amount) <= amountMax);
        }

        if (request.Unusual == true && settings.UnusualEnabled())
        {
            query = query.Where(t => t.Unusual != null && t.UnusualDismissedAt == null);
        }

        if (request.Uncategorized == true)
        {
            query = query.Where(t => t.IsSplit
                ? db.TransactionLines.Any(l => l.TransactionId == t.Id && l.CategoryId == null)
                : t.CategoryId == null);
        }

        if (request.Duplicates == true)
        {
            var pairs = PossibleDuplicates.Pairs(db);
            query = query.Where(t => pairs.Any(p => p.Id == t.Id));
        }

        return query;
    }

    private Task<Func<Transaction, TransactionResponse>> ResponderAsync(
        IReadOnlyList<Transaction> transactions,
        string? search,
        CancellationToken cancellationToken) =>
        TransactionResponses.ResponderAsync(db, currentUser, settings, transactions, search, cancellationToken);

    private async Task<Dictionary<TransactionId, List<TagId>>> LoadTagsOfFilteredAsync(
        TransactionFilterRequest request,
        CancellationToken cancellationToken)
    {
        var matching = Filtered(request);
        var pairs = await db.TransactionTags
            .Where(x => matching.Any(t => t.Id == x.TransactionId))
            .Select(x => new { x.TransactionId, x.TagId })
            .ToListAsync(cancellationToken);

        return TransactionResponses.GroupTags(pairs.Select(pair => (pair.TransactionId, pair.TagId)));
    }
}
