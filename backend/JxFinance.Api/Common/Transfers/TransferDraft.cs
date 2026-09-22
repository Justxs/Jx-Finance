using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;

namespace JxFinance.Common.Transfers;

public sealed record TransferDraft(
    AccountId FromAccountId,
    AccountId ToAccountId,
    decimal Amount,
    Currency? Currency,
    decimal? ReceivedAmount,
    Currency? ReceivedCurrency);
