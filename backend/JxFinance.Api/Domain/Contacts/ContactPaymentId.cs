using JxFinance.Domain.Common;

namespace JxFinance.Domain.Contacts;

public readonly record struct ContactPaymentId(Guid Value) : IStronglyTypedId<ContactPaymentId>
{
    public static ContactPaymentId From(Guid value) => new(value);

    public static ContactPaymentId New() => new(Guid.NewGuid());

    public override string ToString() => Value.ToString();
}
