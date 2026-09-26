using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Transfers;
using JxFinance.Common.Trash;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transfers;
using JxFinance.Domain.Trash;
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
public sealed class TransferService(
    AppDbContext db,
    ITransferAmountResolver amountResolver,
    IDeletionRecorder deletions) : ITransferService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("Transfer not found.");

    public async Task<PagedResponse<TransferResponse>> GetPageAsync(
        GetTransfersRequest request,
        CancellationToken cancellationToken)
    {
        var query = db.Transfers.AsQueryable();
        if (request.Date is { } date) query = query.Where(t => t.Date == date);
        var page = await query.ToPageAsync(
            request,
            sorted => sorted.OrderByDescending(t => t.Date).ThenByDescending(t => t.CreatedAt),
            cancellationToken);

        var ids = page.Items.Select(t => t.Id).ToList();
        var receipts = (await db.TransferImports
                .Where(r => ids.Contains(r.TransferId))
                .Select(r => new { r.TransferId, r.AccountId })
                .ToListAsync(cancellationToken))
            .ToLookup(r => r.TransferId, r => r.AccountId);

        return page.Map(t => t.ToResponse(receipts[t.Id].ToList()));
    }

    public async Task<Result<TransferResponse>> CreateAsync(
        CreateTransferRequest request,
        CancellationToken cancellationToken)
    {
        var draft = ToDraft(request);
        var amounts = await amountResolver.ResolveAsync(draft, [], cancellationToken);
        if (!amounts.TryGetValue(out var resolved))
        {
            return amounts.Error;
        }

        var transfer = request.ToEntity(resolved.Sent, resolved.Received);

        db.Transfers.Add(transfer);
        await db.SaveChangesAsync(cancellationToken);

        return transfer.ToResponse();
    }

    public async Task<Result<TransferResponse>> UpdateAsync(
        UpdateTransferRequest request,
        CancellationToken cancellationToken)
    {
        var transferId = new TransferId(request.Id);
        if (await db.Transfers.FirstOrDefaultAsync(t => t.Id == transferId, cancellationToken) is not { } transfer)
        {
            return NotFound;
        }

        if (!await SeesBothAccountsAsync(transfer, cancellationToken))
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Access to both accounts is required.");
        }

        var draft = ToDraft(request);
        var amounts = await amountResolver.ResolveAsync(
            draft,
            [transfer.Amount.Currency, transfer.ReceivedAmount.Currency],
            cancellationToken);
        if (!amounts.TryGetValue(out var resolved))
        {
            return amounts.Error;
        }

        var (sent, received) = resolved;
        var receiptAccounts = await db.TransferImports
            .Where(r => r.TransferId == transferId)
            .Select(r => r.AccountId)
            .ToListAsync(cancellationToken);
        if (LockedChange(transfer, draft, request.Date, sent, received, receiptAccounts) is { } locked)
        {
            return new DomainError(ErrorCodes.ValueLocked, locked);
        }

        request.ApplyTo(transfer, sent, received);
        await db.SaveChangesAsync(cancellationToken);

        return transfer.ToResponse(receiptAccounts);
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var transferId = new TransferId(id);
        if (await db.Transfers.FirstOrDefaultAsync(t => t.Id == transferId, cancellationToken) is not { } transfer)
        {
            return NotFound;
        }

        if (!await SeesBothAccountsAsync(transfer, cancellationToken))
        {
            return new DomainError(ErrorCodes.AccessForbidden, "Access to both accounts is required.");
        }

        deletions.Record(
            TrashKind.Transfer,
            id,
            TrashLabel.Dated(transfer.Description, transfer.Date, transfer.Amount));

        db.Transfers.Remove(transfer);
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }

    private static TransferDraft ToDraft(ITransferInput input) => new(
        new AccountId(input.FromAccountId),
        new AccountId(input.ToAccountId),
        input.Amount,
        input.Currency,
        input.ReceivedAmount,
        input.ReceivedCurrency);

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
}
