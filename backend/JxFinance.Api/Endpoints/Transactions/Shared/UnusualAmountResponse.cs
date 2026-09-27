using JxFinance.Common.Json;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.Transactions.Shared;

public sealed record UnusualAmountResponse(
    UnusualBasis Basis,
    [property: Money] decimal TypicalAmount,
    decimal Factor,
    int SampleSize);
