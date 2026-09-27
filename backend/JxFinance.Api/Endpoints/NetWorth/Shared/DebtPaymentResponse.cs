using JxFinance.Common.Amortization;
using JxFinance.Common.Json;
using JxFinance.Domain.NetWorth;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.NetWorth.Shared;

public sealed record DebtPaymentResponse(
    Guid Id,
    Guid TransactionId,
    DateOnly Date,
    Guid AccountId,
    string? Description,
    [property: Money] decimal Amount,
    DebtPaymentKind Kind,
    [property: Money] decimal Interest,
    [property: Money] decimal Principal,
    bool PrincipalTyped,
    [property: Money] decimal Overpaid,
    [property: Money] decimal Balance);

public sealed record DebtTracking(DebtTrack Track, bool Incomplete, int Unavailable, IReadOnlyDictionary<Guid, Transaction> Transactions);
