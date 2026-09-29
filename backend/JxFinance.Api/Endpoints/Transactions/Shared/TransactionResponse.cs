using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.Transactions.Shared;

public sealed record TransactionResponse(
    Guid Id,
    Guid AccountId,
    Guid? CategoryId,
    FlowType Type,
    [property: Money] decimal Amount,
    DateOnly Date,
    string? Description,
    TransactionSource Source,
    bool IsSplit,
    DateTimeOffset CreatedAt,
    IReadOnlyList<TransactionLineResponse>? Lines,
    Currency Currency,
    [property: Money] decimal ReportingAmount,
    IReadOnlyList<Guid> TagIds,
    int AttachmentCount,
    UnusualAmountResponse? Unusual,
    bool UnusualDismissed,
    TransactionDebtPaymentResponse? DebtPayment = null,
    TransactionRefundOfResponse? RefundOf = null,
    [property: Money] decimal? RefundedAmount = null);

public sealed record TransactionDebtPaymentResponse(Guid Id, Guid DebtId, string DebtName);

public sealed record TransactionRefundOfResponse(Guid Id, DateOnly Date, string? Description);
