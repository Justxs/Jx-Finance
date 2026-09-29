using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.SettleUp;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Transfers;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Households.CreateSettlement;
using JxFinance.Endpoints.Households.CreateSharedExpense;
using JxFinance.Endpoints.Households.GetSettlements;
using JxFinance.Endpoints.Households.GetSharedExpenses;
using JxFinance.Endpoints.Households.Interfaces;
using JxFinance.Endpoints.Households.Shared;
using JxFinance.Endpoints.Households.UpdateSharedExpense;
using JxFinance.Endpoints.Transfers.CreateTransfer;
using JxFinance.Endpoints.Transfers.Interfaces;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Households.Services;

[RegisterService<ISettleUpService>(LifeTime.Scoped)]
public sealed class SettleUpService(
    AppDbContext db,
    ICurrentUser currentUser,
    IDeletionRecorder deletions,
    ITransferService transfers) : ISettleUpService
{
    private const string HouseholdMissing = "Household not found.";
    private static readonly DomainError ExpenseMissing = EntityLookup.NotFound("Split not found.");
    private static readonly DomainError SettlementMissing = EntityLookup.NotFound("Payment not found.");

    private static readonly DomainError TransactionNotFound = new(ErrorCodes.ReferenceNotFound, "Transaction not found.");
    private static readonly DomainError AccountNotFound = new(ErrorCodes.ReferenceNotFound, "Account not found.");
    private static readonly DomainError TransferNotFound = new(ErrorCodes.ReferenceNotFound, "Transfer not found.");
    private static readonly DomainError NotPayer =
        new(ErrorCodes.SettleUpNotPayer, "Only an expense paid from an account you own can be split.");
    private static readonly DomainError NotExpense = new(ErrorCodes.SettleUpNotExpense, "Only an expense can be split.");
    private static readonly DomainError AlreadySplit = new(ErrorCodes.SettleUpAlreadySplit, "This expense is already split.");
    private static readonly DomainError NotMember =
        new(ErrorCodes.HouseholdNotMember, "Everyone taking part must be a member of the household.");
    private static readonly DomainError NoOtherMember =
        new(ErrorCodes.SettleUpNoOtherMember, "Split with at least one other member.");
    private static readonly DomainError SharesMismatch =
        new(ErrorCodes.SettleUpSharesMismatch, "The amounts must add up to the expense.");
    private static readonly DomainError PayerOnly = new(ErrorCodes.AccessForbidden, "Only the member who paid can do this.");
    private static readonly DomainError PartiesOnly = new(ErrorCodes.AccessForbidden, "Only the payer or the payee can do this.");
    private static readonly DomainError AccountOwner = new(
        ErrorCodes.SettleUpAccountOwner,
        "The money must leave an account of the payer and arrive in an account of the payee.");
    private static readonly DomainError CurrencyMismatch =
        new(ErrorCodes.SettleUpCurrencyMismatch, "Both accounts must be held in the payment's currency.");
    private static readonly DomainError TransferTaken =
        new(ErrorCodes.SettleUpTransferTaken, "That transfer already settles another payment.");

    private Guid Me => currentUser.Id;

    public async Task<Result<SettleUpResponse>> GetBalancesAsync(Guid householdId, CancellationToken cancellationToken)
    {
        var found = await HouseholdAsync(householdId, cancellationToken);
        if (!found.TryGetValue(out var id))
        {
            return found.Error;
        }

        var balances = (await BalancesAsync(id, cancellationToken))
            .Where(b => b.Value != 0)
            .OrderBy(b => b.Key.Currency)
            .ThenByDescending(b => b.Value)
            .ToList();
        var names = await NamesAsync(balances.Select(b => b.Key.UserId), cancellationToken);
        var members = await MembersAsync(id, cancellationToken);
        var payments = balances
            .GroupBy(b => b.Key.Currency)
            .SelectMany(group => SettleUpPlanner
                .Plan([.. group.Select(b => new MemberBalance(b.Key.UserId, b.Value))])
                .Select(p => new SuggestedPaymentResponse(
                    p.FromUserId,
                    names.GetValueOrDefault(p.FromUserId, ""),
                    p.ToUserId,
                    names.GetValueOrDefault(p.ToUserId, ""),
                    group.Key,
                    p.Amount)))
            .ToList();

        return new SettleUpResponse(
            [
                .. balances.Select(b => new MemberBalanceResponse(
                    b.Key.UserId,
                    names.GetValueOrDefault(b.Key.UserId, ""),
                    members.Contains(b.Key.UserId),
                    b.Key.Currency,
                    b.Value)),
            ],
            payments);
    }

    public async Task<Result<PagedResponse<SharedExpenseResponse>>> GetSharedExpensesAsync(
        GetSharedExpensesRequest request,
        CancellationToken cancellationToken)
    {
        var found = await HouseholdAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var id))
        {
            return found.Error;
        }

        var page = await db.SharedExpenses
            .AsNoTracking()
            .Where(e => e.HouseholdId == id)
            .ToPageAsync(
                request,
                sorted => sorted.OrderByDescending(e => e.Date).ThenByDescending(e => e.CreatedAt).ThenBy(e => e.Id),
                cancellationToken);
        var described = await DescribeAsync(page.Items, cancellationToken);

        return new PagedResponse<SharedExpenseResponse>(described, page.Page, page.PageSize, page.Total);
    }

    public async Task<Result<SharedExpenseResponse>> CreateSharedExpenseAsync(
        CreateSharedExpenseRequest request,
        CancellationToken cancellationToken)
    {
        var found = await HouseholdAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var householdId))
        {
            return found.Error;
        }

        var transactionId = new TransactionId(request.TransactionId);
        var transaction = await db.Transactions.AsNoTracking().FirstOrDefaultAsync(t => t.Id == transactionId, cancellationToken);
        if (await RefusedSplitAsync(transaction, cancellationToken) is { } refused)
        {
            return refused;
        }

        if (await db.SharedExpenses.IgnoreQueryFilters(QueryFilters.OwnerOnly).AnyAsync(e => e.TransactionId == transactionId, cancellationToken))
        {
            return AlreadySplit;
        }

        var expense = new SharedExpense { HouseholdId = householdId, TransactionId = transactionId, Method = request.Method };
        Copy(transaction!, expense);
        var shares = await SharesAsync(expense, request, [], cancellationToken);
        if (!shares.TryGetValue(out var rows))
        {
            return shares.Error;
        }

        db.SharedExpenses.Add(expense);
        db.SharedExpenseShares.AddRange(rows);
        if (await db.SaveOrConflictAsync(AlreadySplit, cancellationToken) is { } conflict)
        {
            return conflict;
        }

        return (await DescribeAsync([expense], cancellationToken))[0];
    }

    public async Task<Result<SharedExpenseResponse>> UpdateSharedExpenseAsync(
        UpdateSharedExpenseRequest request,
        CancellationToken cancellationToken)
    {
        var found = await PayersExpenseAsync(request.Id, request.ExpenseId, cancellationToken);
        if (!found.TryGetValue(out var expense))
        {
            return found.Error;
        }

        if (request.RefreshFromTransaction)
        {
            var transaction = await db.Transactions.AsNoTracking()
                .FirstOrDefaultAsync(t => t.Id == expense.TransactionId, cancellationToken);
            if (await RefusedSplitAsync(transaction, cancellationToken) is { } refused)
            {
                return refused;
            }

            Copy(transaction!, expense);
        }

        var stored = await db.SharedExpenseShares.Where(s => s.SharedExpenseId == expense.Id).ToListAsync(cancellationToken);
        var shares = await SharesAsync(expense, request, [.. stored.Select(s => s.UserId)], cancellationToken);
        if (!shares.TryGetValue(out var wanted))
        {
            return shares.Error;
        }

        foreach (var share in stored.Where(s => wanted.TrueForAll(w => w.UserId != s.UserId)))
        {
            db.SharedExpenseShares.Remove(share);
        }

        foreach (var share in wanted)
        {
            if (stored.Find(s => s.UserId == share.UserId) is { } kept)
            {
                kept.Weight = share.Weight;
                kept.Amount = share.Amount;
            }
            else
            {
                db.SharedExpenseShares.Add(share);
            }
        }

        expense.Method = request.Method;
        await db.SaveChangesAsync(cancellationToken);

        return (await DescribeAsync([expense], cancellationToken))[0];
    }

    public async Task<Result<Guid>> DeleteSharedExpenseAsync(Guid householdId, Guid expenseId, CancellationToken cancellationToken)
    {
        var found = await PayersExpenseAsync(householdId, expenseId, cancellationToken);
        if (!found.TryGetValue(out var expense))
        {
            return found.Error;
        }

        var shares = await db.SharedExpenseShares.CountAsync(s => s.SharedExpenseId == expense.Id, cancellationToken);
        deletions.Record(
            TrashKind.SharedExpense,
            expense.Id.Value,
            SettleUpText.Split(expense.Description, expense.Date, expense.Amount, shares));
        db.SharedExpenses.Remove(expense);
        await db.SaveChangesAsync(cancellationToken);

        return expenseId;
    }

    public async Task<Result<PagedResponse<HouseholdSettlementResponse>>> GetSettlementsAsync(
        GetSettlementsRequest request,
        CancellationToken cancellationToken)
    {
        var found = await HouseholdAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var id))
        {
            return found.Error;
        }

        var page = await db.Settlements
            .AsNoTracking()
            .Where(s => s.HouseholdId == id)
            .ToPageAsync(
                request,
                sorted => sorted.OrderByDescending(s => s.Date).ThenByDescending(s => s.CreatedAt).ThenBy(s => s.Id),
                cancellationToken);
        var names = await NamesAsync(page.Items.SelectMany(s => new[] { s.FromUserId, s.ToUserId }), cancellationToken);

        return page.Map(s => ToResponse(s, names));
    }

    public async Task<Result<HouseholdSettlementResponse>> CreateSettlementAsync(
        CreateSettlementRequest request,
        CancellationToken cancellationToken)
    {
        var found = await HouseholdAsync(request.Id, cancellationToken);
        if (!found.TryGetValue(out var householdId))
        {
            return found.Error;
        }

        if (Me != request.FromUserId && Me != request.ToUserId)
        {
            return PartiesOnly;
        }

        if (!await ArePartiesAsync(householdId, [request.FromUserId, request.ToUserId], cancellationToken))
        {
            return NotMember;
        }

        var settlement = new Settlement
        {
            HouseholdId = householdId,
            FromUserId = request.FromUserId,
            ToUserId = request.ToUserId,
            Amount = new Money(request.Amount, request.Currency),
            Date = request.Date,
            Note = OptionalText.Normalize(request.Note),
        };

        await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var linked = await LinkTransferAsync(request, settlement.Note, cancellationToken);
        if (!linked.TryGetValue(out var transferId))
        {
            return linked.Error;
        }

        settlement.TransferId = transferId;
        db.Settlements.Add(settlement);
        if (await db.SaveOrConflictAsync(TransferTaken, cancellationToken) is { } conflict)
        {
            return conflict;
        }

        await dbTransaction.CommitAsync(cancellationToken);

        var names = await NamesAsync([settlement.FromUserId, settlement.ToUserId], cancellationToken);
        return ToResponse(settlement, names);
    }

    public async Task<Result<Guid>> DeleteSettlementAsync(Guid householdId, Guid settlementId, CancellationToken cancellationToken)
    {
        var id = new SettlementId(settlementId);
        var household = new HouseholdId(householdId);
        var found = await db.Settlements.FindOrNotFoundAsync(
            s => s.Id == id && s.HouseholdId == household,
            SettlementMissing,
            cancellationToken);
        if (!found.TryGetValue(out var settlement))
        {
            return found.Error;
        }

        if (Me != settlement.FromUserId && Me != settlement.ToUserId)
        {
            return PartiesOnly;
        }

        var names = await NamesAsync([settlement.FromUserId, settlement.ToUserId], cancellationToken);
        deletions.Record(
            TrashKind.Settlement,
            settlementId,
            SettleUpText.Paid(names.GetValueOrDefault(settlement.FromUserId, ""), names.GetValueOrDefault(settlement.ToUserId, ""), settlement.Amount));
        db.Settlements.Remove(settlement);
        await db.SaveChangesAsync(cancellationToken);

        return settlementId;
    }

    private async Task<Result<HouseholdId>> HouseholdAsync(Guid id, CancellationToken cancellationToken)
    {
        var householdId = new HouseholdId(id);
        return await HouseholdVisibility.IsVisibleAsync(db, currentUser, householdId, cancellationToken)
            ? householdId
            : EntityLookup.NotFound(HouseholdMissing);
    }

    private async Task<Result<SharedExpense>> PayersExpenseAsync(Guid householdId, Guid expenseId, CancellationToken cancellationToken)
    {
        var id = new SharedExpenseId(expenseId);
        var household = new HouseholdId(householdId);
        var found = await db.SharedExpenses.FindOrNotFoundAsync(
            e => e.Id == id && e.HouseholdId == household,
            ExpenseMissing,
            cancellationToken);

        return found.TryGetValue(out var expense) && expense.UserId != Me ? PayerOnly : found;
    }

    private async Task<DomainError?> RefusedSplitAsync(Transaction? transaction, CancellationToken cancellationToken)
    {
        if (transaction is null)
        {
            return TransactionNotFound;
        }

        if (!await db.Accounts.AnyAsync(a => a.Id == transaction.AccountId && a.UserId == Me, cancellationToken))
        {
            return NotPayer;
        }

        return transaction is { Type: FlowType.Expense, Amount.Amount: > 0 } ? null : NotExpense;
    }

    private static void Copy(Transaction transaction, SharedExpense expense)
    {
        expense.Date = transaction.Date;
        expense.Description = TextLimit.Ellipsize(OptionalText.Normalize(transaction.Description), SharedExpense.DescriptionMaxLength);
        expense.Amount = transaction.Amount;
    }

    private async Task<Result<List<SharedExpenseShare>>> SharesAsync(
        SharedExpense expense,
        ISharedExpenseInput input,
        IReadOnlyCollection<Guid> alreadyOn,
        CancellationToken cancellationToken)
    {
        var members = await MembersAsync(expense.HouseholdId, cancellationToken);
        if (input.Shares.Any(s => !members.Contains(s.UserId) && !alreadyOn.Contains(s.UserId)))
        {
            return NotMember;
        }

        if (input.Shares.All(s => s.UserId == Me))
        {
            return NoOtherMember;
        }

        var amounts = ShareAllocator.Allocate(
            expense.Amount.Amount,
            input.Method,
            [.. input.Shares.Select(s => new SharePart(s.Weight, s.Amount))]);
        if (amounts is null)
        {
            return SharesMismatch;
        }

        return input.Shares
            .Select((share, index) => new SharedExpenseShare
            {
                SharedExpenseId = expense.Id,
                UserId = share.UserId,
                Weight = input.Method == SplitMethod.Shares ? share.Weight : null,
                Amount = amounts[index],
            })
            .ToList();
    }

    private async Task<Result<TransferId?>> LinkTransferAsync(
        CreateSettlementRequest request,
        string? description,
        CancellationToken cancellationToken)
    {
        if (request.Transfer is { } transfer)
        {
            if (await RefusedAccountsAsync(request, transfer.FromAccountId, transfer.ToAccountId, cancellationToken) is { } refused)
            {
                return refused;
            }

            var created = await transfers.CreateAsync(
                new CreateTransferRequest(transfer.FromAccountId, transfer.ToAccountId, request.Amount, request.Date, description, request.Currency),
                cancellationToken);
            return created.TryGetValue(out var written) ? new TransferId(written.Id) : created.Error;
        }

        if (request.TransferId is not { } id)
        {
            return (TransferId?)null;
        }

        var transferId = new TransferId(id);
        var existing = await db.Transfers.AsNoTracking().FirstOrDefaultAsync(t => t.Id == transferId, cancellationToken);
        if (existing is null)
        {
            return TransferNotFound;
        }

        if (await RefusedAccountsAsync(request, existing.FromAccountId.Value, existing.ToAccountId.Value, cancellationToken) is { } wrong)
        {
            return wrong;
        }

        if (existing.Amount.Currency != request.Currency)
        {
            return CurrencyMismatch;
        }

        return await db.Settlements.IgnoreQueryFilters(QueryFilters.OwnerOnly).AnyAsync(s => s.TransferId == transferId, cancellationToken)
            ? TransferTaken
            : transferId;
    }

    private async Task<DomainError?> RefusedAccountsAsync(
        CreateSettlementRequest request,
        Guid fromAccountId,
        Guid toAccountId,
        CancellationToken cancellationToken)
    {
        var from = new AccountId(fromAccountId);
        var to = new AccountId(toAccountId);
        var accounts = await db.Accounts
            .Where(a => a.Id == from || a.Id == to)
            .Select(a => new { a.Id, a.UserId, a.StartingBalance.Currency })
            .ToListAsync(cancellationToken);
        var source = accounts.Find(a => a.Id == from);
        var target = accounts.Find(a => a.Id == to);
        if (source is null || target is null)
        {
            return AccountNotFound;
        }

        if (source.UserId != request.FromUserId || target.UserId != request.ToUserId)
        {
            return AccountOwner;
        }

        return source.Currency == request.Currency && target.Currency == request.Currency ? null : CurrencyMismatch;
    }

    private async Task<bool> ArePartiesAsync(HouseholdId householdId, Guid[] userIds, CancellationToken cancellationToken)
    {
        var members = await MembersAsync(householdId, cancellationToken);
        if (userIds.All(members.Contains))
        {
            return true;
        }

        var owing = (await BalancesAsync(householdId, cancellationToken))
            .Where(b => b.Value != 0)
            .Select(b => b.Key.UserId)
            .ToHashSet();
        return userIds.All(id => members.Contains(id) || owing.Contains(id));
    }

    private async Task<Dictionary<(Guid UserId, Currency Currency), decimal>> BalancesAsync(
        HouseholdId householdId,
        CancellationToken cancellationToken)
    {
        var expenses = await db.SharedExpenses
            .AsNoTracking()
            .Where(e => e.HouseholdId == householdId)
            .Select(e => new { e.Id, e.UserId, e.TransactionId, e.Amount.Currency })
            .ToListAsync(cancellationToken);
        var transactionIds = expenses.Select(e => e.TransactionId).ToList();
        var counted = await db.Transactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(t => transactionIds.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);
        var countedExpenses = expenses.Where(e => counted.Contains(e.TransactionId)).ToDictionary(e => e.Id);
        var expenseIds = countedExpenses.Keys.ToList();
        var shares = await db.SharedExpenseShares
            .Where(s => expenseIds.Contains(s.SharedExpenseId))
            .Select(s => new { s.SharedExpenseId, s.UserId, s.Amount })
            .ToListAsync(cancellationToken);
        var settlements = await db.Settlements
            .AsNoTracking()
            .Where(s => s.HouseholdId == householdId)
            .Select(s => new { s.FromUserId, s.ToUserId, s.Amount })
            .ToListAsync(cancellationToken);

        var balances = new Dictionary<(Guid UserId, Currency Currency), decimal>();
        void Add(Guid userId, Currency currency, decimal amount) =>
            balances[(userId, currency)] = balances.GetValueOrDefault((userId, currency)) + amount;

        foreach (var share in shares)
        {
            var expense = countedExpenses[share.SharedExpenseId];
            Add(expense.UserId, expense.Currency, share.Amount);
            Add(share.UserId, expense.Currency, -share.Amount);
        }

        foreach (var settlement in settlements)
        {
            Add(settlement.FromUserId, settlement.Amount.Currency, settlement.Amount.Amount);
            Add(settlement.ToUserId, settlement.Amount.Currency, -settlement.Amount.Amount);
        }

        return balances;
    }

    private async Task<HashSet<Guid>> MembersAsync(HouseholdId householdId, CancellationToken cancellationToken) =>
        [
            .. await db.HouseholdMemberships
                .Where(m => m.HouseholdId == householdId)
                .Select(m => m.UserId)
                .ToListAsync(cancellationToken),
        ];

    private Task<Dictionary<Guid, string>> NamesAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken) =>
        db.Users.DisplayNamesAsync(userIds, cancellationToken);

    private async Task<List<SharedExpenseResponse>> DescribeAsync(
        IReadOnlyCollection<SharedExpense> expenses,
        CancellationToken cancellationToken)
    {
        var ids = expenses.Select(e => e.Id).ToList();
        var shares = (await db.SharedExpenseShares
                .AsNoTracking()
                .Where(s => ids.Contains(s.SharedExpenseId))
                .ToListAsync(cancellationToken))
            .ToLookup(s => s.SharedExpenseId);
        var transactionIds = expenses.Select(e => e.TransactionId).ToList();
        var counted = await db.Transactions
            .IgnoreQueryFilters(QueryFilters.OwnerOnly)
            .Where(t => transactionIds.Contains(t.Id))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);
        var paidByMe = expenses.Where(e => e.UserId == Me).Select(e => e.TransactionId).ToList();
        var current = await db.Transactions
            .Where(t => paidByMe.Contains(t.Id))
            .Select(t => new { t.Id, t.Amount })
            .ToDictionaryAsync(t => t.Id, t => t.Amount, cancellationToken);
        var names = await NamesAsync(
            expenses.Select(e => e.UserId).Concat(shares.SelectMany(group => group.Select(s => s.UserId))),
            cancellationToken);

        return
        [
            .. expenses.Select(expense =>
            {
                var mine = expense.UserId == Me;
                var parts = shares[expense.Id]
                    .Select(s => new ShareResponse(s.UserId, names.GetValueOrDefault(s.UserId, ""), s.Weight, s.Amount))
                    .OrderBy(s => s.Name, StringComparer.CurrentCultureIgnoreCase)
                    .ToList();
                return new SharedExpenseResponse(
                    expense.Id.Value,
                    expense.UserId,
                    names.GetValueOrDefault(expense.UserId, ""),
                    expense.Date,
                    expense.Description,
                    expense.Amount.Amount,
                    expense.Amount.Currency,
                    expense.Method,
                    parts,
                    parts.Find(s => s.UserId == Me)?.Amount,
                    counted.Contains(expense.TransactionId),
                    mine ? expense.TransactionId.Value : null,
                    mine ? current.TryGetValue(expense.TransactionId, out var amount) && amount != expense.Amount : null);
            }),
        ];
    }

    private static HouseholdSettlementResponse ToResponse(Settlement settlement, Dictionary<Guid, string> names) => new(
        settlement.Id.Value,
        settlement.FromUserId,
        names.GetValueOrDefault(settlement.FromUserId, ""),
        settlement.ToUserId,
        names.GetValueOrDefault(settlement.ToUserId, ""),
        settlement.Amount.Amount,
        settlement.Amount.Currency,
        settlement.Date,
        settlement.Note,
        settlement.TransferId is not null);
}
