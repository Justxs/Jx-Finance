using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;

namespace JxFinance.Endpoints.NetWorth.UpdateDebtPayment;

public sealed record UpdateDebtPaymentRequest(
    Guid Id,
    Guid PaymentId,
    DebtPaymentKind Kind,
    [property: Money] decimal? Principal = null);
