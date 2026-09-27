using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Domain.NetWorth;

public sealed class DebtPayment : OwnableEntity
{
    public DebtPaymentId Id { get; set; } = DebtPaymentId.New();
    public DebtId DebtId { get; set; }
    public TransactionId TransactionId { get; set; }
    public DebtPaymentKind Kind { get; set; }
    public decimal? Principal { get; set; }
}
