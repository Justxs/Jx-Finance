using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.ExchangeRates;

[RegisterService<ITransactionValuation>(LifeTime.Scoped)]
public sealed class TransactionValuation(AppDbContext db, IExchangeRateService rates) : ITransactionValuation
{
    public async Task<Result<TransactionValue>> ValueAsync(
        AccountId accountId,
        decimal amount,
        Currency? currency,
        DateOnly date,
        IReadOnlyCollection<Currency> currenciesInUse,
        CancellationToken cancellationToken)
    {
        var resolved = currency ?? await db.Accounts
            .Where(a => a.Id == accountId)
            .Select(a => (Currency?)a.StartingBalance.Currency)
            .FirstOrDefaultAsync(cancellationToken);
        if (resolved is not { } valued)
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Account does not exist.");
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
