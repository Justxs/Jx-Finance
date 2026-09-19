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

        return new PagedResponse<TransferResponse>(items.Select(mapper.FromEntity).ToList(), page, pageSize, total);
    }

    public async Task<Result<TransferResponse>> CreateAsync(
        CreateTransferRequest request,
        CancellationToken cancellationToken)
    {
        var fromAccountId = new AccountId(request.FromAccountId);
        var toAccountId = new AccountId(request.ToAccountId);

        var currencies = await db.Accounts
            .Where(a => a.Id == fromAccountId || a.Id == toAccountId)
            .Select(a => new { a.Id, a.StartingBalance.Currency })
            .ToDictionaryAsync(a => a.Id, a => a.Currency, cancellationToken);
        if (!currencies.TryGetValue(fromAccountId, out var fromCurrency))
        {
            return Result<TransferResponse>.Failure(ErrorCodes.ReferenceNotFound, "Source account does not exist.");
        }

        if (!currencies.TryGetValue(toAccountId, out var toCurrency))
        {
            return Result<TransferResponse>.Failure(ErrorCodes.ReferenceNotFound, "Destination account does not exist.");
        }

        var sent = new Money(request.Amount, request.Currency ?? fromCurrency);
        var receivedCurrency = request.ReceivedCurrency ?? (request.Currency is null ? toCurrency : sent.Currency);
        if (receivedCurrency != sent.Currency && request.ReceivedAmount is null)
        {
            return Result<TransferResponse>.Failure(
                ErrorCodes.TransferReceivedAmountRequired,
                "A transfer between currencies needs the received amount.");
        }

        var received = request.ReceivedAmount is { } receivedAmount ? new Money(receivedAmount, receivedCurrency) : sent;
        if (received.Currency == sent.Currency && received.Amount != sent.Amount)
        {
            return Result<TransferResponse>.Failure(
                ErrorCodes.TransferAmountMismatch,
                "Sent and received amounts must match when the currency is the same.");
        }

        if (rates.UnusableReason(sent.Currency, received.Currency) is { } currencyError)
        {
            return Result<TransferResponse>.Failure(ErrorCodes.CurrencyDisabled, currencyError);
        }

        var transfer = mapper.ToEntity(request, sent, received);

        db.Transfers.Add(transfer);
        await db.SaveChangesAsync(cancellationToken);

        return Result<TransferResponse>.Success(mapper.FromEntity(transfer));
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var transferId = new TransferId(id);
        var transfer = await db.Transfers.FirstOrDefaultAsync(t => t.Id == transferId, cancellationToken);
        if (transfer is null)
        {
            return Result<Guid>.Failure(ErrorCodes.ResourceNotFound, "Transfer not found.");
        }

        var visibleAccounts = await db.Accounts.CountAsync(
            a => a.Id == transfer.FromAccountId || a.Id == transfer.ToAccountId, cancellationToken);
        if (visibleAccounts != 2)
        {
            return Result<Guid>.Failure(ErrorCodes.AccessForbidden, "Access to both accounts is required.");
        }

        db.Transfers.Remove(transfer);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }
}
