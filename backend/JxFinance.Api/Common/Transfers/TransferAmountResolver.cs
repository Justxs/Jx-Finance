using FastEndpoints;
using JxFinance.Common.Errors;
using JxFinance.Common.ExchangeRates;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common.Transfers;

[RegisterService<ITransferAmountResolver>(LifeTime.Scoped)]
public sealed class TransferAmountResolver(AppDbContext db, IExchangeRateService rates) : ITransferAmountResolver
{
    public async Task<Result<TransferAmounts>> ResolveAsync(
        TransferDraft draft,
        IReadOnlyCollection<Currency> currenciesInUse,
        CancellationToken cancellationToken)
    {
        var currencies = await db.Accounts
            .Where(a => a.Id == draft.FromAccountId || a.Id == draft.ToAccountId)
            .Select(a => new { a.Id, a.StartingBalance.Currency })
            .ToDictionaryAsync(a => a.Id, a => a.Currency, cancellationToken);
        if (!currencies.TryGetValue(draft.FromAccountId, out var fromCurrency))
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Source account does not exist.");
        }

        if (!currencies.TryGetValue(draft.ToAccountId, out var toCurrency))
        {
            return new DomainError(ErrorCodes.ReferenceNotFound, "Destination account does not exist.");
        }

        var sent = new Money(draft.Amount, draft.Currency ?? fromCurrency);
        var receivedCurrency = draft.ReceivedCurrency ?? (draft.Currency is null ? toCurrency : sent.Currency);
        if (receivedCurrency != sent.Currency && draft.ReceivedAmount is null)
        {
            return new DomainError(
                ErrorCodes.TransferReceivedAmountRequired,
                "A transfer between currencies needs the received amount.");
        }

        var received = draft.ReceivedAmount is { } receivedAmount ? new Money(receivedAmount, receivedCurrency) : sent;
        if (received.Currency == sent.Currency && received.Amount != sent.Amount)
        {
            return new DomainError(
                ErrorCodes.TransferAmountMismatch,
                "Sent and received amounts must match when the currency is the same.");
        }

        var newCurrencies = new[] { sent.Currency, received.Currency }.Except(currenciesInUse).ToArray();
        if (rates.UnusableReason(newCurrencies) is { } currencyError)
        {
            return new DomainError(ErrorCodes.CurrencyDisabled, currencyError);
        }

        return new TransferAmounts(sent, received);
    }
}
