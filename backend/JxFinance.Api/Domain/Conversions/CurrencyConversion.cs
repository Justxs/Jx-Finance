using JxFinance.Domain.Accounts;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Domain.Conversions;

public sealed class CurrencyConversion : OwnableEntity
{
    public CurrencyConversionId Id { get; set; } = CurrencyConversionId.New();
    public AccountId AccountId { get; set; }
    public Money FromAmount { get; set; }
    public Money ToAmount { get; set; }
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
    public TransactionId? FeeTransactionId { get; set; }
}
