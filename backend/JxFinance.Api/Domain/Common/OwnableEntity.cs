namespace JxFinance.Domain.Common;

public abstract class OwnableEntity : EntityBase
{
    public Guid UserId { get; set; }
}
