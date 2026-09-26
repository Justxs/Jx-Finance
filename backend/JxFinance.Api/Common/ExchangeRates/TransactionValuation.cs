using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.References;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Common.ExchangeRates;

[RegisterService<ITransactionValuation>(LifeTime.Scoped)]
public sealed class TransactionValuation(IReferenceGuard references, IExchangeRateService rates) : ITransactionValuation
{
    public async Task<Result<TransactionValue>> ValueAsync(
        AccountId accountId,
        decimal amount,
        Currency? currency,
        DateOnly date,
        IReadOnlyCollection<Currency> currenciesInUse,
        CancellationToken cancellationToken)
    {
        var resolved = currency is { } requested ? requested : await references.AccountCurrencyAsync(accountId, cancellationToken);
        if (!resolved.TryGetValue(out var valued))
        {
            return resolved.Error;
        }

        if (!currenciesInUse.Contains(valued) && rates.UnusableReason(valued) is { } currencyError)
        {
            return new DomainError(ErrorCodes.CurrencyDisabled, currencyError);
        }

        var money = new Money(amount, valued);
        var reporting = await rates.ToReportingAsync(money, date, cancellationToken);
        return reporting.IsSuccess
            ? new TransactionValue(money, reporting.Value)
            : reporting.Error;
    }
}
