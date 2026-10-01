using JxFinance.Common.Json;
using JxFinance.Domain.Common;
using JxFinance.Domain.Households;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Contacts.Shared;
using JxFinance.Endpoints.Households.Shared;

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
    [property: Money] decimal? RefundedAmount = null,
    TransactionSharedExpenseResponse? SharedExpense = null,
    string? Note = null,
    string? PayeeName = null,
    int? SpreadMonths = null,
    DateOnly? SpreadUntil = null,
    string? Place = null,
    decimal? Latitude = null,
    decimal? Longitude = null,
    Guid? GroupId = null,
    bool EnteredByMe = false,
    TransactionReceiptItemResponse? ReceiptItem = null,
    ContactSplitResponse? ContactSplit = null,
    string? Payee = null,
    SpreadDirection? SpreadDirection = null,
    DateOnly? SpreadFrom = null);

public sealed record TransactionReceiptItemResponse(string Name, DateOnly? WarrantyUntil);

public sealed record TransactionDebtPaymentResponse(Guid Id, Guid DebtId, string DebtName);

public sealed record TransactionSharedExpenseResponse(
    Guid Id,
    Guid HouseholdId,
    string HouseholdName,
    SplitMethod Method,
    IReadOnlyList<ShareResponse> Shares,
    [property: Money] decimal MyShare,
    bool AmountDiffers);

public sealed record TransactionRefundOfResponse(Guid Id, DateOnly Date, string? Description);
