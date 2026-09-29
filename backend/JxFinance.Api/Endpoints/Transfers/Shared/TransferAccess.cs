using JxFinance.Domain.Transfers;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Transfers.Shared;

public static class TransferAccess
{
    public static async Task<bool> SeesBothAccountsAsync(
        this AppDbContext db,
        Transfer transfer,
        CancellationToken cancellationToken) =>
        await db.Accounts.CountAsync(
            a => a.Id == transfer.FromAccountId || a.Id == transfer.ToAccountId,
            cancellationToken) == 2;
}
