using JxFinance.Domain.Common;

namespace JxFinance.Domain.Goals;

public sealed class Goal : OwnableEntity
{
    public GoalId Id { get; set; } = GoalId.New();
    public required string Name { get; set; }
    public Money TargetAmount { get; set; }
    public Money CurrentAmount { get; set; }
    public DateOnly? TargetDate { get; set; }
}
