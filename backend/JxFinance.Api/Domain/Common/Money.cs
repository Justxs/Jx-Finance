using System.Globalization;

namespace JxFinance.Domain.Common;

public readonly record struct Money
{
    public decimal Amount { get; }
    public Currency Currency { get; }

    public Money(decimal amount, Currency currency = Currency.Eur)
    {
        Amount = decimal.Round(amount, 2);
        Currency = currency;
    }

    public static Money Zero => new(0m);

    public static explicit operator decimal(Money money) => money.Amount;

    public static explicit operator Money(decimal amount) => new(amount);

    public static Money operator +(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return new Money(left.Amount + right.Amount, left.Currency);
    }

    public static Money operator +(Money money, decimal amount) => new(money.Amount + amount, money.Currency);

    public static Money operator -(Money left, Money right)
    {
        EnsureSameCurrency(left, right);
        return new Money(left.Amount - right.Amount, left.Currency);
    }

    public static Money operator -(Money money, decimal amount) => new(money.Amount - amount, money.Currency);

    public static Money operator -(Money money) => new(-money.Amount, money.Currency);

    public override string ToString() => Amount.ToString("0.00", CultureInfo.InvariantCulture);

    private static void EnsureSameCurrency(Money left, Money right)
    {
        if (left.Currency != right.Currency)
        {
            throw new InvalidOperationException("Cannot operate on Money values with different currencies.");
        }
    }
}
