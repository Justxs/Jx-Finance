using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Transfers.CreateTransfer;
using JxFinance.Endpoints.Transfers.GetTransfers;
using JxFinance.Endpoints.Transfers.Interfaces;
using JxFinance.Endpoints.Transfers.Mappers;
using JxFinance.Endpoints.Transfers.Shared;
using JxFinance.Endpoints.Transfers.UpdateTransfer;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Transfers.Services;

[RegisterService<ITransferService>(LifeTime.Scoped)]
public sealed class TransferService(AppDbContext db, TransferMapper mapper, IExchangeRateService rates) : ITransferService
{
    public async Task<PagedResponse<TransferResponse>> GetPageAsync(
        GetTransfersRequest request,
        CancellationToken cancellationToken)
    {
        var page = Math.Max(request.Page, 1);
        var pageSize = Math.Clamp(request.PageSize, 1, 200);

        var query = db.Transfers.AsQueryable();
        if (request.Date is { } date) query = query.Where(t => t.Date == date);
        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var ids = items.Select(t => t.Id).ToList();
        var receipts = (await db.TransferImports
                .Where(r => ids.Contains(r.TransferId))
                .Select(r => new { r.TransferId, r.AccountId })
                .ToListAsync(cancellationToken))
            .ToLookup(r => r.TransferId, r => r.AccountId);

        return new PagedResponse<TransferResponse>(
            items.Select(t => mapper.FromEntity(t, receipts[t.Id].ToList())).ToList(),
            page,
            pageSize,
            total);
    }

    public async Task<Result<TransferResponse>> CreateAsync(
        CreateTransferRequest request,
        CancellationToken cancellationToken)
    {
        var draft = new TransferDraft(
            new AccountId(request.FromAccountId),
            new AccountId(request.ToAccountId),
            request.Amount,
            request.Currency,
            request.ReceivedAmount,
            request.ReceivedCurrency);
        var amounts = await ResolveAmountsAsync(draft, [], cancellationToken);
        if (amounts.IsFailure)
        {
            return Result<TransferResponse>.FailureFrom(amounts);
        }

        var transfer = mapper.ToEntity(request, amounts.Value.Sent, amounts.Value.Received);

        db.Transfers.Add(transfer);
        await db.SaveChangesAsync(cancellationToken);

        return Result<TransferResponse>.Success(mapper.FromEntity(transfer));
    }

    public async Task<Result<TransferResponse>> UpdateAsync(
        UpdateTransferRequest request,
        CancellationToken cancellationToken)
    {
        var transferId = new TransferId(request.Id);
        var transfer = await db.Transfers.FirstOrDefaultAsync(t => t.Id == transferId, cancellationToken);
        if (transfer is null)
        {
            return Result<TransferResponse>.Failure(ErrorCodes.ResourceNotFound, "Transfer not found.");
        }

        if (!await SeesBothAccountsAsync(transfer, cancellationToken))
        {
            return Result<TransferResponse>.Failure(ErrorCodes.AccessForbidden, "Access to both accounts is required.");
        }

        var draft = new TransferDraft(
            new AccountId(request.FromAccountId),
            new AccountId(request.ToAccountId),
            request.Amount,
            request.Currency,
            request.ReceivedAmount,
            request.ReceivedCurrency);
        var amounts = await ResolveAmountsAsync(
            draft,
            [transfer.Amount.Currency, transfer.ReceivedAmount.Currency],
            cancellationToken);
        if (amounts.IsFailure)
        {
            return Result<TransferResponse>.FailureFrom(amounts);
        }

        var (sent, received) = amounts.Value;
        var receiptAccounts = await db.TransferImports
            .Where(r => r.TransferId == transferId)
            .Select(r => r.AccountId)
            .ToListAsync(cancellationToken);
        if (LockedChange(transfer, draft, request.Date, sent, received, receiptAccounts) is { } locked)
        {
            return Result<TransferResponse>.Failure(ErrorCodes.ValueLocked, locked);
        }

        transfer.FromAccountId = draft.FromAccountId;
        transfer.ToAccountId = draft.ToAccountId;
        transfer.Amount = sent;
        transfer.ReceivedAmount = received;
        transfer.Date = request.Date;
        transfer.Description = OptionalText.Normalize(request.Description);
        await db.SaveChangesAsync(cancellationToken);

        return Result<TransferResponse>.Success(mapper.FromEntity(transfer, receiptAccounts));
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var transferId = new TransferId(id);
        var transfer = await db.Transfers.FirstOrDefaultAsync(t => t.Id == transferId, cancellationToken);
        if (transfer is null)
        {
            return Result<Guid>.Failure(ErrorCodes.ResourceNotFound, "Transfer not found.");
        }

        if (!await SeesBothAccountsAsync(transfer, cancellationToken))
        {
            return Result<Guid>.Failure(ErrorCodes.AccessForbidden, "Access to both accounts is required.");
        }

        db.Transfers.Remove(transfer);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }

    private static string? LockedChange(
        Transfer transfer,
        TransferDraft draft,
        DateOnly date,
        Money sent,
        Money received,
        List<AccountId> receiptAccounts)
    {
        if (receiptAccounts.Count == 0)
        {
            return null;
        }

        if (date != transfer.Date)
        {
            return "The date comes from an imported statement entry and cannot change.";
        }

        foreach (var account in receiptAccounts)
        {
            var isSource = account == transfer.FromAccountId;
            if ((isSource ? draft.FromAccountId : draft.ToAccountId) != account)
            {
                return "The imported account of this transfer cannot change.";
            }

            if (isSource ? sent != transfer.Amount : received != transfer.ReceivedAmount)
            {
                return "The amount comes from an imported statement entry and cannot change.";
            }
        }

        return null;
    }

    private async Task<bool> SeesBothAccountsAsync(Transfer transfer, CancellationToken cancellationToken) =>
        await db.Accounts.CountAsync(
            a => a.Id == transfer.FromAccountId || a.Id == transfer.ToAccountId,
            cancellationToken) == 2;

    private async Task<Result<(Money Sent, Money Received)>> ResolveAmountsAsync(
        TransferDraft draft,
        Currency[] currenciesInUse,
        CancellationToken cancellationToken)
    {
        var currencies = await db.Accounts
            .Where(a => a.Id == draft.FromAccountId || a.Id == draft.ToAccountId)
            .Select(a => new { a.Id, a.StartingBalance.Currency })
            .ToDictionaryAsync(a => a.Id, a => a.Currency, cancellationToken);
        if (!currencies.TryGetValue(draft.FromAccountId, out var fromCurrency))
        {
            return Result<(Money, Money)>.Failure(ErrorCodes.ReferenceNotFound, "Source account does not exist.");
        }

        if (!currencies.TryGetValue(draft.ToAccountId, out var toCurrency))
        {
            return Result<(Money, Money)>.Failure(ErrorCodes.ReferenceNotFound, "Destination account does not exist.");
        }

        var sent = new Money(draft.Amount, draft.Currency ?? fromCurrency);
        var receivedCurrency = draft.ReceivedCurrency ?? (draft.Currency is null ? toCurrency : sent.Currency);
        if (receivedCurrency != sent.Currency && draft.ReceivedAmount is null)
        {
            return Result<(Money, Money)>.Failure(
                ErrorCodes.TransferReceivedAmountRequired,
                "A transfer between currencies needs the received amount.");
        }

        var received = draft.ReceivedAmount is { } receivedAmount ? new Money(receivedAmount, receivedCurrency) : sent;
        if (received.Currency == sent.Currency && received.Amount != sent.Amount)
        {
            return Result<(Money, Money)>.Failure(
                ErrorCodes.TransferAmountMismatch,
                "Sent and received amounts must match when the currency is the same.");
        }

        var newCurrencies = new[] { sent.Currency, received.Currency }.Except(currenciesInUse).ToArray();
        if (rates.UnusableReason(newCurrencies) is { } currencyError)
        {
            return Result<(Money, Money)>.Failure(ErrorCodes.CurrencyDisabled, currencyError);
        }

        return Result<(Money, Money)>.Success((sent, received));
    }

    private sealed record TransferDraft(
        AccountId FromAccountId,
        AccountId ToAccountId,
        decimal Amount,
        Currency? Currency,
        decimal? ReceivedAmount,
        Currency? ReceivedCurrency);
}
