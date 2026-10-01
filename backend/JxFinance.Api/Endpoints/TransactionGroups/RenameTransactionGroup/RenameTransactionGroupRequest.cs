using JxFinance.Common.Sharing;
using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.TransactionGroups.RenameTransactionGroup;

public sealed record RenameTransactionGroupRequest(
    Guid Id,
    string Name,
    Scope Scope = Scope.Personal,
    Guid? HouseholdId = null) : IShareableInput;
