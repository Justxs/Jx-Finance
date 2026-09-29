using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Domain.Households;

public sealed class SharedExpense : OwnableEntity, IHouseholdScoped
{
    public const int DescriptionMaxLength = 200;

    public SharedExpenseId Id { get; set; } = SharedExpenseId.New();
    public HouseholdId HouseholdId { get; set; }
    public TransactionId TransactionId { get; set; }
    public DateOnly Date { get; set; }
    public string? Description { get; set; }
    public Money Amount { get; set; }
    public SplitMethod Method { get; set; }
}
