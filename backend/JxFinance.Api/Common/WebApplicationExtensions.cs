using JxFinance.Common.Settings;
using JxFinance.Domain.Settings;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Common;

public static class WebApplicationExtensions
{
    public static async Task ApplyMigrationsAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<AppDbContext>();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseMigrator");
        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
        if (pending.Count > 0)
        {
            logger.LogInformation("Applying {Count} migration(s): {Migrations}", pending.Count, string.Join(", ", pending));
            await db.Database.MigrateAsync();
        }

        var store = services.GetRequiredService<IInstanceSettingsStore>();
        store.Set(await db.InstanceSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == InstanceSettings.SingletonId) ?? store.Defaults());

        var filled = await PayeeKeyBackfill.RunAsync(db, CancellationToken.None);
        if (filled > 0)
        {
            logger.LogInformation("Filled the payee key of {Count} transaction(s)", filled);
        }

        if (app.Environment.IsDevelopment())
        {
            var users = services.GetRequiredService<UserManager<AppUser>>();
            await DevDataSeeder.SeedAsync(db, users, logger);
        }
    }
}
