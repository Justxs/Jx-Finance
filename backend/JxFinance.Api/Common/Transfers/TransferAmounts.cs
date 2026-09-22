using JxFinance.Domain.Common;

namespace JxFinance.Common.Transfers;

public sealed record TransferAmounts(Money Sent, Money Received);
