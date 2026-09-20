using JxFinance.Domain.Common;

namespace JxFinance.Endpoints.Transfers.Shared;

public interface ITransferInput
{
    Guid FromAccountId { get; }
    Guid ToAccountId { get; }
    decimal Amount { get; }
    DateOnly Date { get; }
    string? Description { get; }
    Currency? Currency { get; }
    decimal? ReceivedAmount { get; }
    Currency? ReceivedCurrency { get; }
}
