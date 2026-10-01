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

        var recorded = await DebtBalanceBackfill.RunAsync(db, CancellationToken.None);
        if (recorded > 0)
        {
            logger.LogInformation("Recorded the first balance of {Count} debt(s)", recorded);
        }

        var spread = await SpreadFromBackfill.RunAsync(db, CancellationToken.None);
        if (spread > 0)
        {
            logger.LogInformation("Filled the first spread month of {Count} transaction(s)", spread);
        }

        if (app.Environment.IsDevelopment())
        {
            var users = services.GetRequiredService<UserManager<AppUser>>();
            await DevDataSeeder.SeedAsync(db, users, logger);
        }
    }
}
