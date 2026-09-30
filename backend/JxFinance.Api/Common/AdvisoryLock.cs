using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

namespace JxFinance.Common;

public enum AppLock : long
{
    RecurringBillReminders = 738192435,
    FirstRunSetup = 738192436,
    AdministratorChange = 738192437,
    BudgetAlerts = 738192438,
    EmailOutbox = 738192439,
    DiscordOutbox = 738192440,
    UnusualAmounts = 738192441,
    MonthCloseReminders = 738192442,
    MonthlyDigest = 738192443,
    ReceiptReadings = 738192444,
    UserExport = 738192445,
    LowBalanceAlerts = 738192446,
}

public static class AdvisoryLock
{
    public static Task LockAsync(this DatabaseFacade database, Guid key, CancellationToken cancellationToken) =>
        LockAsync(database, BitConverter.ToInt64(key.ToByteArray(), 0), cancellationToken);

    public static Task LockAsync(this DatabaseFacade database, AppLock key, CancellationToken cancellationToken) =>
        LockAsync(database, (long)key, cancellationToken);

    public static Task<bool> TryLockAsync(this DatabaseFacade database, AppLock scope, Guid key, CancellationToken cancellationToken) =>
        database.SqlQuery<bool>($"SELECT pg_try_advisory_xact_lock({(int)scope}, hashtext({key.ToString()})) AS \"Value\"")
            .SingleAsync(cancellationToken);

    private static Task<int> LockAsync(DatabaseFacade database, long key, CancellationToken cancellationToken) =>
        database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({key})", cancellationToken);
}
