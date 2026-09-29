namespace JxFinance.Common.SettleUp;

public sealed record MemberBalance(Guid UserId, decimal Balance);

public sealed record SuggestedPayment(Guid FromUserId, Guid ToUserId, decimal Amount);

public static class SettleUpPlanner
{
    public static IReadOnlyList<SuggestedPayment> Plan(IReadOnlyList<MemberBalance> balances)
    {
        var creditors = Queue(balances.Where(b => b.Balance > 0));
        var debtors = Queue(balances.Where(b => b.Balance < 0).Select(b => b with { Balance = -b.Balance }));
        var payments = new List<SuggestedPayment>();
        while (creditors.Count > 0 && debtors.Count > 0)
        {
            var creditor = creditors[0];
            var debtor = debtors[0];
            var amount = Math.Min(creditor.Balance, debtor.Balance);
            payments.Add(new SuggestedPayment(debtor.UserId, creditor.UserId, amount));
            Settle(creditors, creditor, amount);
            Settle(debtors, debtor, amount);
        }

        return payments;
    }

    private static List<MemberBalance> Queue(IEnumerable<MemberBalance> balances) =>
        [.. balances.OrderByDescending(b => b.Balance).ThenBy(b => b.UserId)];

    private static void Settle(List<MemberBalance> queue, MemberBalance first, decimal amount)
    {
        queue.RemoveAt(0);
        var rest = first.Balance - amount;
        if (rest > 0)
        {
            var index = queue.FindIndex(b => b.Balance < rest || (b.Balance == rest && b.UserId.CompareTo(first.UserId) > 0));
            queue.Insert(index < 0 ? queue.Count : index, first with { Balance = rest });
        }
    }
}
