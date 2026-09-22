using JxFinance.Domain.Common;

namespace JxFinance.Common.Transfers;

public interface ITransferAmountResolver
{
    Task<Result<TransferAmounts>> ResolveAsync(
        TransferDraft draft,
        IReadOnlyCollection<Currency> currenciesInUse,
        CancellationToken cancellationToken);

    Result<TransferAmounts> Resolve(
        TransferDraft draft,
        Currency fromCurrency,
        Currency toCurrency,
        IReadOnlyCollection<Currency> currenciesInUse);
}
