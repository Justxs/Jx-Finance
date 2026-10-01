namespace JxFinance.Endpoints.TransactionGroups.Shared;

public sealed record TransactionGroupResponse(Guid Id, string Name, int MemberCount, DateOnly FirstDate, DateOnly LastDate);
