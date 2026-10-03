using JxFinance.Common;
using JxFinance.Common.Payees;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Contacts.Shared;
using JxFinance.Endpoints.Households.Shared;
using JxFinance.Endpoints.Transactions.Mappers;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Transactions.Services;

internal static class TransactionResponses
{
    public static readonly DomainError NotFound = EntityLookup.NotFound("Transaction not found.");

    public static bool UnusualEnabled(this IInstanceSettingsStore settings) => settings.Current.IsEnabled(Feature.UnusualAmounts);

    public static bool LocationsEnabled(this IInstanceSettingsStore settings) => settings.Current.IsEnabled(Feature.Locations);

    public static bool ReceiptItemsEnabled(this IInstanceSettingsStore settings) =>
        settings.Current.IsEnabled(Feature.ReceiptReading) && settings.Current.IsEnabled(Feature.Attachments);

    public static bool PayeeNamesEnabled(this IInstanceSettingsStore settings) => settings.Current.IsEnabled(Feature.PayeeNames);

    public static TransactionResponse Placed(this IInstanceSettingsStore settings, TransactionResponse response) =>
        settings.LocationsEnabled() ? response : response.WithoutPlace();

    public static Task<Transaction?> FindAsync(AppDbContext db, TransactionId id, CancellationToken cancellationToken) =>
        db.Transactions.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

    public static async Task<TransactionResponse> ResponseAsync(
        AppDbContext db,
        ICurrentUser currentUser,
        IInstanceSettingsStore settings,
        Transaction transaction,
        CancellationToken cancellationToken) =>
        (await ResponderAsync(db, currentUser, settings, [transaction], null, cancellationToken))(transaction);

    public static async Task<Func<Transaction, TransactionResponse>> ResponderAsync(
        AppDbContext db,
        ICurrentUser currentUser,
        IInstanceSettingsStore settings,
        IReadOnlyList<Transaction> transactions,
        string? search,
        CancellationToken cancellationToken)
    {
        var ids = transactions.Select(t => t.Id).ToList();
        var linesByTransaction = await LoadLinesAsync(db, transactions.Where(t => t.IsSplit).Select(t => t.Id), cancellationToken);
        var tagsByTransaction = await LoadTagsAsync(db, ids, cancellationToken);
        var attachmentCounts = settings.Current.IsEnabled(Feature.Attachments)
            ? await CountAttachmentsAsync(db, ids, cancellationToken)
            : [];
        var debtPayments = await DebtPaymentsOfAsync(db, settings, ids, cancellationToken);
        var refunds = await RefundMarksAsync(db, transactions, cancellationToken);
        var splits = await SharedExpensesOfAsync(db, currentUser, settings, transactions, cancellationToken);
        var contactSplits = settings.Current.IsEnabled(Feature.People)
            ? await ContactSplitMarks.OfAsync(db, ids, cancellationToken)
            : [];
        var payeeNames = settings.PayeeNamesEnabled()
            ? await db.PayeeNamesForAsync(transactions.Select(t => t.PayeeKey), cancellationToken)
            : new Dictionary<string, string>();
        var groups = await VisibleGroupsAsync(db, transactions, cancellationToken);
        var receiptItems = string.IsNullOrWhiteSpace(search) || !settings.ReceiptItemsEnabled()
            ? []
            : await ReceiptItemSearch.MatchesAsync(db, ids, search, cancellationToken);
        var callerId = currentUser.Id;

        return t => Shown(settings, refunds.Apply(t, t.ToResponse(
            linesByTransaction.GetValueOrDefault(t.Id),
            tagsByTransaction.GetValueOrDefault(t.Id),
            attachmentCounts.GetValueOrDefault(t.Id)) with
        {
            DebtPayment = debtPayments.GetValueOrDefault(t.Id),
            SharedExpense = splits.GetValueOrDefault(t.Id),
            ContactSplit = contactSplits.GetValueOrDefault(t.Id),
            PayeeName = t.PayeeKey is { } key ? payeeNames.GetValueOrDefault(key) : null,
            GroupId = t.GroupId is { } groupId && groups.Contains(groupId) ? groupId.Value : null,
            EnteredByMe = t.UserId == callerId,
            ReceiptItem = receiptItems.GetValueOrDefault(t.Id),
        }));
    }

    public static async Task<Dictionary<TransactionId, List<TagId>>> LoadTagsAsync(
        AppDbContext db,
        IEnumerable<TransactionId> transactionIds,
        CancellationToken cancellationToken)
    {
        var ids = transactionIds.ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        var pairs = await db.TransactionTags
            .Where(x => ids.Contains(x.TransactionId))
            .Select(x => new { x.TransactionId, x.TagId })
            .ToListAsync(cancellationToken);

        return GroupTags(pairs.Select(pair => (pair.TransactionId, pair.TagId)));
    }

    public static Dictionary<TransactionId, List<TagId>> GroupTags(IEnumerable<(TransactionId TransactionId, TagId TagId)> pairs) =>
        pairs
            .GroupBy(pair => pair.TransactionId)
            .ToDictionary(group => group.Key, group => group.Select(pair => pair.TagId).ToList());

    private static TransactionResponse Shown(IInstanceSettingsStore settings, TransactionResponse response) =>
        settings.Placed(settings.UnusualEnabled() ? response : response.WithoutUnusual());

    private static async Task<HashSet<TransactionGroupId>> VisibleGroupsAsync(
        AppDbContext db,
        IReadOnlyCollection<Transaction> transactions,
        CancellationToken cancellationToken)
    {
        var ids = transactions.Select(t => t.GroupId).OfType<TransactionGroupId>().Distinct().ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        return [.. await db.TransactionGroups.Where(g => ids.Contains(g.Id)).Select(g => g.Id).ToListAsync(cancellationToken)];
    }

    private static async Task<Dictionary<TransactionId, List<TransactionLine>>> LoadLinesAsync(
        AppDbContext db,
        IEnumerable<TransactionId> transactionIds,
        CancellationToken cancellationToken)
    {
        var ids = transactionIds.ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        var lines = await db.TransactionLines
            .Where(l => ids.Contains(l.TransactionId))
            .OrderBy(l => l.Position).ThenBy(l => l.Id)
            .ToListAsync(cancellationToken);
        return lines.GroupBy(l => l.TransactionId).ToDictionary(g => g.Key, g => g.ToList());
    }

    private static async Task<Dictionary<TransactionId, int>> CountAttachmentsAsync(
        AppDbContext db,
        IEnumerable<TransactionId> transactionIds,
        CancellationToken cancellationToken)
    {
        var ids = transactionIds.ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        return await db.TransactionAttachments
            .Where(a => ids.Contains(a.TransactionId))
            .GroupBy(a => a.TransactionId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Key, g => g.Count, cancellationToken);
    }

    private static async Task<Dictionary<TransactionId, TransactionDebtPaymentResponse>> DebtPaymentsOfAsync(
        AppDbContext db,
        IInstanceSettingsStore settings,
        IEnumerable<TransactionId> transactionIds,
        CancellationToken cancellationToken)
    {
        if (!settings.Current.IsEnabled(Feature.NetWorth))
        {
            return [];
        }

        var ids = transactionIds.ToList();
        return await db.DebtPayments
            .Where(p => ids.Contains(p.TransactionId))
            .Join(db.Debts, p => p.DebtId, d => d.Id, (p, d) => new { p.TransactionId, Marker = new TransactionDebtPaymentResponse(p.Id.Value, d.Id.Value, d.Name) })
            .ToDictionaryAsync(x => x.TransactionId, x => x.Marker, cancellationToken);
    }

    private static async Task<Dictionary<TransactionId, TransactionSharedExpenseResponse>> SharedExpensesOfAsync(
        AppDbContext db,
        ICurrentUser currentUser,
        IInstanceSettingsStore settings,
        IReadOnlyCollection<Transaction> transactions,
        CancellationToken cancellationToken)
    {
        if (!settings.Current.IsEnabled(Feature.Households))
        {
            return [];
        }

        var ids = transactions.Select(t => t.Id).ToList();
        var payerId = currentUser.Id;
        var splits = await db.SharedExpenses
            .Where(e => ids.Contains(e.TransactionId) && e.UserId == payerId)
            .Join(db.Households, e => e.HouseholdId, h => h.Id, (e, h) => new
            {
                e.Id,
                e.TransactionId,
                e.Amount,
                e.Method,
                HouseholdId = h.Id,
                HouseholdName = h.Name,
            })
            .ToListAsync(cancellationToken);
        var splitIds = splits.Select(s => s.Id).ToList();
        var shares = (await db.SharedExpenseShares
                .Where(s => splitIds.Contains(s.SharedExpenseId))
                .Join(db.Users, s => s.UserId, u => u.Id, (s, u) => new { s.SharedExpenseId, s.UserId, s.Weight, s.Amount, u.DisplayName, u.Email })
                .ToListAsync(cancellationToken))
            .ToLookup(
                s => s.SharedExpenseId,
                s => new ShareResponse(s.UserId, AppUser.DisplayNameOrEmail(s.DisplayName, s.Email), s.Weight, s.Amount));
        var amounts = transactions.ToDictionary(t => t.Id, t => t.Amount);

        return splits.ToDictionary(
            s => s.TransactionId,
            s => new TransactionSharedExpenseResponse(
                s.Id.Value,
                s.HouseholdId.Value,
                s.HouseholdName,
                s.Method,
                [.. shares[s.Id].OrderBy(share => share.Name, StringComparer.CurrentCultureIgnoreCase)],
                shares[s.Id].FirstOrDefault(share => share.UserId == payerId)?.Amount ?? 0m,
                s.Amount != amounts[s.TransactionId]));
    }

    private static async Task<RefundMarks> RefundMarksAsync(
        AppDbContext db,
        IReadOnlyCollection<Transaction> transactions,
        CancellationToken cancellationToken)
    {
        var originalIds = transactions.Select(t => t.RefundOfTransactionId).OfType<TransactionId>().Distinct().ToList();
        var originals = originalIds.Count == 0
            ? []
            : await db.Transactions
                .Where(t => originalIds.Contains(t.Id))
                .Select(t => new { t.Id, t.Date, t.Description })
                .ToDictionaryAsync(t => t.Id, t => new TransactionRefundOfResponse(t.Id.Value, t.Date, t.Description), cancellationToken);

        var purchaseIds = transactions
            .Where(t => t.Type == FlowType.Expense && t.Amount.Amount > 0)
            .Select(t => (TransactionId?)t.Id)
            .ToList();
        var refunded = purchaseIds.Count == 0
            ? []
            : await db.Transactions
                .Where(t => purchaseIds.Contains(t.RefundOfTransactionId))
                .GroupBy(t => t.RefundOfTransactionId)
                .Select(g => new { g.Key, Total = g.Sum(t => t.ReportingAmount) })
                .ToDictionaryAsync(g => g.Key!.Value, g => Money.Round(-g.Total), cancellationToken);

        return new RefundMarks(originals, refunded);
    }

    private sealed record RefundMarks(
        Dictionary<TransactionId, TransactionRefundOfResponse> Originals,
        Dictionary<TransactionId, decimal> Refunded)
    {
        public TransactionResponse Apply(Transaction transaction, TransactionResponse response) => response with
        {
            RefundOf = transaction.RefundOfTransactionId is { } id ? Originals.GetValueOrDefault(id) : null,
            RefundedAmount = Refunded.TryGetValue(transaction.Id, out var total) ? total : null,
        };
    }
}
