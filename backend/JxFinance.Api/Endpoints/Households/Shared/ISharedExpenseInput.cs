using JxFinance.Domain.Households;

namespace JxFinance.Endpoints.Households.Shared;

public interface ISharedExpenseInput
{
    SplitMethod Method { get; }
    IReadOnlyList<ShareRequest> Shares { get; }
}
