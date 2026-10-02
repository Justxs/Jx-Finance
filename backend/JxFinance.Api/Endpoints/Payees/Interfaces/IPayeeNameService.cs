using JxFinance.Domain.Common;
using JxFinance.Endpoints.Payees.SetPayeeName;
using JxFinance.Endpoints.Payees.Shared;

namespace JxFinance.Endpoints.Payees.Interfaces;

public interface IPayeeNameService
{
    Task<IReadOnlyList<PayeeNameResponse>> GetAllAsync(CancellationToken cancellationToken);

    Task<Result<PayeeNameResponse>> SetAsync(SetPayeeNameRequest request, CancellationToken cancellationToken);

    Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
