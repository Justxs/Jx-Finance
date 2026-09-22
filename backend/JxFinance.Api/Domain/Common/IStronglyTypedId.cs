namespace JxFinance.Domain.Common;

public interface IStronglyTypedId
{
    Guid Value { get; }
}

public interface IStronglyTypedId<TSelf> : IStronglyTypedId
    where TSelf : struct, IStronglyTypedId<TSelf>
{
    static abstract TSelf From(Guid value);
}
