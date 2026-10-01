using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.TransactionGroups.Shared;

public sealed record GroupMembersResponse(IReadOnlyList<TransactionResponse> Items, bool Truncated);
