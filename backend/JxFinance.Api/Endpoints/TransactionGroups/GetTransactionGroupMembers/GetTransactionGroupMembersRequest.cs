using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.TransactionGroups.GetTransactionGroupMembers;

public sealed class GetTransactionGroupMembersRequest : TransactionFilterRequest
{
    public Guid Id { get; init; }
}
