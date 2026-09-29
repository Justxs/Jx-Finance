using JxFinance.Common.SettleUp;

namespace JxFinance.Tests.Unit;

public sealed class SettleUpPlannerTests
{
    private static readonly Guid Ona = Guid.Parse("00000000-0000-0000-0000-000000000001");
    private static readonly Guid Jonas = Guid.Parse("00000000-0000-0000-0000-000000000002");
    private static readonly Guid Rasa = Guid.Parse("00000000-0000-0000-0000-000000000003");
    private static readonly Guid Tomas = Guid.Parse("00000000-0000-0000-0000-000000000004");
    private static readonly Guid Ieva = Guid.Parse("00000000-0000-0000-0000-000000000005");

    [Fact]
    public void Two_members_settle_in_one_payment()
    {
        var payments = SettleUpPlanner.Plan([new MemberBalance(Ona, 42.50m), new MemberBalance(Jonas, -42.50m)]);

        Assert.Equal([new SuggestedPayment(Jonas, Ona, 42.50m)], payments);
    }

    [Fact]
    public void Even_balances_need_no_payment()
    {
        Assert.Empty(SettleUpPlanner.Plan([new MemberBalance(Ona, 0m), new MemberBalance(Jonas, 0m)]));
        Assert.Empty(SettleUpPlanner.Plan([]));
    }

    [Fact]
    public void Three_debtors_and_two_creditors_settle_in_at_most_four_payments()
    {
        MemberBalance[] balances =
        [
            new(Ona, 60m),
            new(Jonas, 40m),
            new(Rasa, -50m),
            new(Tomas, -30m),
            new(Ieva, -20m),
        ];

        var payments = SettleUpPlanner.Plan(balances);

        Assert.True(payments.Count <= balances.Length - 1);
        Assert.Equal(
            [new SuggestedPayment(Rasa, Ona, 50m), new SuggestedPayment(Tomas, Jonas, 30m), new SuggestedPayment(Ieva, Ona, 10m), new SuggestedPayment(Ieva, Jonas, 10m)],
            payments);
        AssertSettles(balances, payments);
    }

    [Fact]
    public void Any_balances_that_add_up_to_zero_are_settled_in_fewer_payments_than_members()
    {
        var random = new Random(20260929);
        for (var run = 0; run < 1000; run++)
        {
            var count = random.Next(2, 9);
            var amounts = Enumerable.Range(0, count - 1).Select(_ => random.Next(-100_000, 100_000) / 100m).ToList();
            amounts.Add(-amounts.Sum());
            var balances = amounts.Select(amount => new MemberBalance(Guid.NewGuid(), amount)).ToList();

            var payments = SettleUpPlanner.Plan(balances);

            Assert.True(payments.Count <= count - 1);
            Assert.All(payments, payment => Assert.True(payment.Amount > 0));
            AssertSettles(balances, payments);
        }
    }

    private static void AssertSettles(IEnumerable<MemberBalance> balances, IEnumerable<SuggestedPayment> payments)
    {
        var left = balances.ToDictionary(b => b.UserId, b => b.Balance);
        foreach (var payment in payments)
        {
            left[payment.FromUserId] += payment.Amount;
            left[payment.ToUserId] -= payment.Amount;
        }

        Assert.All(left.Values, balance => Assert.Equal(0m, balance));
    }
}
