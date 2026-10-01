using JxFinance.Common.Json;
using JxFinance.Endpoints.Transactions.Shared;

namespace JxFinance.Endpoints.Transactions.GetLedger;

public enum LedgerItemKind
{
    Transaction,
    Group,
}

public sealed record LedgerItemResponse(LedgerItemKind Kind, TransactionResponse? Transaction, TransactionGroupSummary? Group);

public sealed record TransactionGroupSummary(
    Guid Id,
    string Name,
    DateOnly FirstDate,
    DateOnly LastDate,
    int MemberCount,
    int MatchingCount,
    [property: Money] decimal NetReportingAmount);
