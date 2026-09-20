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
        if (app.Environment.IsDevelopment())
        {
            var users = services.GetRequiredService<UserManager<AppUser>>();
            await DevDataSeeder.SeedAsync(db, users, logger);
        }
    }
}
