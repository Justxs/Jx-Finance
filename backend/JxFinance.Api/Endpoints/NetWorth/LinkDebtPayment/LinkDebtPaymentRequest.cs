using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.LinkDebtPayment;

public sealed record LinkDebtPaymentRequest(
    Guid Id,
    Guid TransactionId,
    DebtPaymentKind? Kind = null,
    [property: Money] decimal? Principal = null);
