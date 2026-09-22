using JxFinance.Domain.Common;

namespace JxFinance.Common.ExchangeRates;

public sealed record TransactionValue(Money Amount, decimal ReportingAmount);
