using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.Subscriptions;
using JxFinance.Domain.Common;
using JxFinance.Domain.Payees;
using JxFinance.Endpoints.Payees.Interfaces;
using JxFinance.Endpoints.Payees.SetPayeeName;
using JxFinance.Endpoints.Payees.Shared;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Payees.Services;

[RegisterService<IPayeeNameService>(LifeTime.Scoped)]
public sealed class PayeeNameService(AppDbContext db) : IPayeeNameService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("Payee name not found.");

    public async Task<IReadOnlyList<PayeeNameResponse>> GetAllAsync(CancellationToken cancellationToken) =>
        await db.PayeeNames
            .AsNoTracking()
            .OrderBy(p => p.Name)
            .ThenBy(p => p.PayeeKey)
            .Select(p => new PayeeNameResponse(p.Id.Value, p.PayeeKey, p.Name))
            .ToListAsync(cancellationToken);

    public async Task<Result<PayeeNameResponse>> SetAsync(SetPayeeNameRequest request, CancellationToken cancellationToken)
    {
        var key = SubscriptionDescription.Normalize(request.Payee)!;
        var name = request.Name.Trim();
        var payee = await db.PayeeNames.FirstOrDefaultAsync(p => p.PayeeKey == key, cancellationToken);
        if (payee is null)
        {
            payee = new PayeeName { PayeeKey = key, Name = name };
            db.PayeeNames.Add(payee);
        }
        else
        {
            payee.Name = name;
        }

        if (await db.SaveOrConflictAsync(new DomainError(ErrorCodes.ConflictBusy, "This payee was named from another window just now. Try again."), cancellationToken) is { } conflict)
        {
            return conflict;
        }

        return new PayeeNameResponse(payee.Id.Value, payee.PayeeKey, payee.Name);
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var payeeNameId = new PayeeNameId(id);
        return db.DeleteOrNotFoundAsync<PayeeName>(id, p => p.Id == payeeNameId, NotFound, cancellationToken);
    }
}
