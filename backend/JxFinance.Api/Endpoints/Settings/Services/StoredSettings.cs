using JxFinance.Common;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Settings.Services;

internal static class StoredSettings
{
    public static async Task<InstanceSettings> ReadAsync(
        AppDbContext db,
        IInstanceSettingsStore store,
        CancellationToken cancellationToken) =>
        await db.InstanceSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == InstanceSettings.SingletonId, cancellationToken)
            ?? store.Defaults();

    public static async Task<DomainError?> UpdateAsync(
        AppDbContext db,
        IInstanceSettingsStore store,
        Func<InstanceSettings, Task<DomainError?>> change,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var settings = await LoadOrCreateAsync(db, store, cancellationToken);
        if (await change(settings) is { } error)
        {
            return error;
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return VersionedSave.Stale;
        }

        await transaction.CommitAsync(cancellationToken);
        store.Set(settings);
        return null;
    }

    private static async Task<InstanceSettings> LoadOrCreateAsync(
        AppDbContext db,
        IInstanceSettingsStore store,
        CancellationToken cancellationToken)
    {
        if (await db.InstanceSettings.FirstOrDefaultAsync(s => s.Id == InstanceSettings.SingletonId, cancellationToken) is { } stored)
        {
            return stored;
        }

        var created = store.Defaults();
        db.InstanceSettings.Add(created);
        return created;
    }
}
