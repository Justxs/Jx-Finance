using JxFinance.Common.Sharing;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.TransactionGroups.CreateTransactionGroup;

public sealed record CreateTransactionGroupRequest(
    string Name,
    IReadOnlyList<Guid> TransactionIds,
    Scope Scope = Scope.Personal,
    Guid? HouseholdId = null) : IShareableInput;
