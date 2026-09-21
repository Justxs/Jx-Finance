using JxFinance.Domain.Common;

namespace JxFinance.Domain.Audit;

public readonly record struct AuditEventId(Guid Value) : IStronglyTypedId<AuditEventId>
{
    public static AuditEventId From(Guid value) => new(value);

    public static AuditEventId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
