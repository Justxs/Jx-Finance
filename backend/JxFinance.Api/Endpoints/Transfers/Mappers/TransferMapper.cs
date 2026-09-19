using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Transfers.CreateTransfer;
using JxFinance.Endpoints.Transfers.Shared;

namespace JxFinance.Endpoints.Transfers.Mappers;

[RegisterService<TransferMapper>(LifeTime.Singleton)]
public sealed class TransferMapper : Mapper<CreateTransferRequest, TransferResponse, Transfer>
{
    public Transfer ToEntity(CreateTransferRequest request, Money sent, Money received) => new()
    {
        FromAccountId = new AccountId(request.FromAccountId),
        ToAccountId = new AccountId(request.ToAccountId),
        Amount = sent,
        ReceivedAmount = received,
        Date = request.Date,
        Description = OptionalText.Normalize(request.Description),
    };

    public override TransferResponse FromEntity(Transfer transfer) => new(
        transfer.Id.Value,
        transfer.FromAccountId.Value,
        transfer.ToAccountId.Value,
        transfer.Amount.Amount,
        transfer.Date,
        transfer.Description,
        transfer.CreatedAt,
        transfer.Amount.Currency,
        transfer.ReceivedAmount.Amount,
        transfer.ReceivedAmount.Currency);
}
