using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transfers;
using JxFinance.Endpoints.Transfers.CreateTransfer;
using JxFinance.Endpoints.Transfers.Shared;

namespace JxFinance.Endpoints.Transfers.Mappers;

public static class TransferMapper
{
    public static Transfer ToEntity(this CreateTransferRequest request, Money sent, Money received)
    {
        var transfer = new Transfer();
        request.ApplyTo(transfer, sent, received);
        return transfer;
    }

    public static void ApplyTo(this ITransferInput input, Transfer transfer, Money sent, Money received)
    {
        transfer.FromAccountId = new AccountId(input.FromAccountId);
        transfer.ToAccountId = new AccountId(input.ToAccountId);
        transfer.Amount = sent;
        transfer.ReceivedAmount = received;
        transfer.Date = input.Date;
        transfer.Description = OptionalText.Normalize(input.Description);
    }

    public static TransferResponse ToResponse(this Transfer transfer) => transfer.ToResponse([]);

    public static TransferResponse ToResponse(this Transfer transfer, IReadOnlyCollection<AccountId> importedAccounts) => new(
        transfer.Id.Value,
        transfer.FromAccountId.Value,
        transfer.ToAccountId.Value,
        transfer.Amount.Amount,
        transfer.Date,
        transfer.Description,
        transfer.CreatedAt,
        transfer.Amount.Currency,
        transfer.ReceivedAmount.Amount,
        transfer.ReceivedAmount.Currency,
        importedAccounts.Contains(transfer.FromAccountId),
        importedAccounts.Contains(transfer.ToAccountId));
}
