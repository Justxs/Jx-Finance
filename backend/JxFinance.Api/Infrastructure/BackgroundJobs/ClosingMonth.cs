using System.Globalization;
using JxFinance.Common;
using JxFinance.Common.Notifications;

namespace JxFinance.Infrastructure.BackgroundJobs;

public sealed record ClosingMonth(DateOnly Month, string Text)
{
    public const int LastDay = 5;

    public static ClosingMonth? On(DateOnly today)
    {
        if (today.Day > LastDay)
        {
            return null;
        }

        var month = DateWindow.MonthOf(today).Start.AddMonths(-1);
        return new ClosingMonth(month, month.ToString(NotificationTexts.MonthFormat, CultureInfo.InvariantCulture));
    }
}
