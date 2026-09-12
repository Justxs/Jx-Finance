using JxFinance.Common;
using JxFinance.Common.Errors;
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

public sealed class TransferService(AppDbContext db, TransferMapper mapper) : ITransferService
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

        var fromExists = await db.Accounts.AnyAsync(a => a.Id == fromAccountId, cancellationToken);
        if (!fromExists)
        {
            return Result<TransferResponse>.Failure(ErrorCodes.Validation, "Source account does not exist.");
        }

        var toExists = await db.Accounts.AnyAsync(a => a.Id == toAccountId, cancellationToken);
        if (!toExists)
        {
            return Result<TransferResponse>.Failure(ErrorCodes.Validation, "Destination account does not exist.");
        }

        var transfer = mapper.ToEntity(request);

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
            return Result<Guid>.Failure(ErrorCodes.NotFound, "Transfer not found.");
        }

        var visibleAccounts = await db.Accounts.CountAsync(
            a => a.Id == transfer.FromAccountId || a.Id == transfer.ToAccountId, cancellationToken);
        if (visibleAccounts != 2)
        {
            return Result<Guid>.Failure(ErrorCodes.Forbidden, "Access to both accounts is required.");
        }

        db.Transfers.Remove(transfer);
        await db.SaveChangesAsync(cancellationToken);

        return Result<Guid>.Success(id);
    }
}
