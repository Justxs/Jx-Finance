using JxFinance.Domain.Common;
using JxFinance.Endpoints.Settings.DeleteExchangeRate;
using JxFinance.Endpoints.Settings.GetExchangeRateEntries;
using JxFinance.Endpoints.Settings.SetExchangeRate;
using JxFinance.Endpoints.Settings.Shared;

namespace JxFinance.Endpoints.Settings.Interfaces;

public interface IExchangeRateEntryService
{
    Task<IReadOnlyList<ExchangeRateEntryResponse>> GetAsync(
        GetExchangeRateEntriesRequest request,
        CancellationToken cancellationToken);

    Task<Result<ExchangeRateEntryResponse>> SetAsync(SetExchangeRateRequest request, CancellationToken cancellationToken);

    Task<Result> DeleteAsync(DeleteExchangeRateRequest request, CancellationToken cancellationToken);
}
