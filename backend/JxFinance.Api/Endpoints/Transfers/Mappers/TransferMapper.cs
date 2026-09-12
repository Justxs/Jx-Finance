using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Transfers.CreateTransfer;
using JxFinance.Endpoints.Transfers.Shared;

namespace JxFinance.Endpoints.Transfers.Mappers;

public sealed class TransferMapper : Mapper<CreateTransferRequest, TransferResponse, Transfer>
{
    public override Transfer ToEntity(CreateTransferRequest request) => new()
    {
        FromAccountId = new AccountId(request.FromAccountId),
        ToAccountId = new AccountId(request.ToAccountId),
        Amount = MoneyWire.Parse(request.Amount),
        Date = request.Date,
        Description = OptionalText.Normalize(request.Description),
    };

    public override TransferResponse FromEntity(Transfer transfer) => new(
        transfer.Id.Value,
        transfer.FromAccountId.Value,
        transfer.ToAccountId.Value,
        MoneyWire.ToWire(transfer.Amount),
        transfer.Date,
        transfer.Description,
        transfer.CreatedAt);
}
