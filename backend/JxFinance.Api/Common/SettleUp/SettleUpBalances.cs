using JxFinance.Domain.Common;

namespace JxFinance.Common.SettleUp;

public sealed record Owed(Guid Creditor, Guid Debtor, Currency Currency, decimal Amount);

public static class SettleUpBalances
{
    public static Dictionary<(Guid Id, Currency Currency), decimal> Of(IEnumerable<Owed> debts)
    {
        var balances = new Dictionary<(Guid Id, Currency Currency), decimal>();
        foreach (var debt in debts)
        {
            balances[(debt.Creditor, debt.Currency)] = balances.GetValueOrDefault((debt.Creditor, debt.Currency)) + debt.Amount;
            balances[(debt.Debtor, debt.Currency)] = balances.GetValueOrDefault((debt.Debtor, debt.Currency)) - debt.Amount;
        }

        return balances;
    }
}
