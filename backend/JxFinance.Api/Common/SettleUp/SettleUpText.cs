using JxFinance.Common.Trash;
using JxFinance.Domain.Common;

namespace JxFinance.Common.SettleUp;

public static class SettleUpText
{
    public static string Split(string? description, DateOnly date, Money amount, int shares) =>
        TrashLabel.Counted(TrashLabel.Dated(description, date, amount), (shares, "share", "shares"));

    public static string Paid(string from, string to, Money amount) => $"{from} paid {to} {TrashLabel.Amount(amount)}";
}
