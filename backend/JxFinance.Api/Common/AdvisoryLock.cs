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
}

public static class AdvisoryLock
{
    public static Task LockAsync(this DatabaseFacade database, Guid key, CancellationToken cancellationToken) =>
        LockAsync(database, BitConverter.ToInt64(key.ToByteArray(), 0), cancellationToken);

    public static Task LockAsync(this DatabaseFacade database, AppLock key, CancellationToken cancellationToken) =>
        LockAsync(database, (long)key, cancellationToken);

    private static Task<int> LockAsync(DatabaseFacade database, long key, CancellationToken cancellationToken) =>
        database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({key})", cancellationToken);
}
