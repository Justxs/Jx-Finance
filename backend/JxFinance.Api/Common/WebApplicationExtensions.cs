using System.ComponentModel;
using System.Diagnostics;
using JxFinance.Infrastructure.Configuration;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace JxFinance.Common;

public static class WebApplicationExtensions
{
    public static async Task ApplyMigrationsAsync(this WebApplication app)
    {
        using var scope = app.Services.CreateScope();
        var services = scope.ServiceProvider;
        var db = services.GetRequiredService<AppDbContext>();
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("DatabaseMigrator");
        var options = services.GetRequiredService<IOptions<AppOptions>>().Value;
        var configuration = services.GetRequiredService<IConfiguration>();

        var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
        if (pending.Count == 0)
        {
            logger.LogInformation("Database is up to date; no migrations to apply.");
            return;
        }

        var applied = (await db.Database.GetAppliedMigrationsAsync()).ToList();
        logger.LogInformation(
            "Applying {Count} pending migration(s): {Migrations}",
            pending.Count,
            string.Join(", ", pending));

        if (applied.Count == 0)
        {
            logger.LogInformation("Fresh database; skipping pre-migration backup (nothing to back up).");
        }
        else if (options.BackupBeforeMigrate)
        {
            var connectionString = configuration.GetConnectionString("Default")!;
            var backedUp = await TryBackupAsync(connectionString, options.BackupDirectory, logger);
            if (!backedUp && options.RequireBackup)
            {
                throw new InvalidOperationException(
                    "Pre-migration backup failed and App:RequireBackup is enabled; aborting startup to protect existing data.");
            }
        }

        await db.Database.MigrateAsync();
        logger.LogInformation("Migrations applied successfully.");
    }

    private static async Task<bool> TryBackupAsync(string connectionString, string backupDirectory, ILogger logger)
    {
        try
        {
            var connection = new NpgsqlConnectionStringBuilder(connectionString);
            Directory.CreateDirectory(backupDirectory);

            var timestamp = DateTimeOffset.UtcNow.ToString("yyyyMMdd-HHmmss");
            var file = Path.Combine(backupDirectory, $"premigration-{connection.Database}-{timestamp}.sql");

            var startInfo = new ProcessStartInfo
            {
                FileName = "pg_dump",
                RedirectStandardError = true,
                UseShellExecute = false,
            };
            startInfo.ArgumentList.Add("--host");
            startInfo.ArgumentList.Add(connection.Host ?? "localhost");
            startInfo.ArgumentList.Add("--port");
            startInfo.ArgumentList.Add(connection.Port.ToString());
            startInfo.ArgumentList.Add("--username");
            startInfo.ArgumentList.Add(connection.Username ?? "postgres");
            startInfo.ArgumentList.Add("--dbname");
            startInfo.ArgumentList.Add(connection.Database ?? "postgres");
            startInfo.ArgumentList.Add("--no-owner");
            startInfo.ArgumentList.Add("--no-privileges");
            startInfo.ArgumentList.Add("--file");
            startInfo.ArgumentList.Add(file);
            startInfo.Environment["PGPASSWORD"] = connection.Password ?? string.Empty;

            using var process = Process.Start(startInfo);
            if (process is null)
            {
                logger.LogWarning("Could not start pg_dump; skipping pre-migration backup.");
                return false;
            }

            var error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0)
            {
                logger.LogError("pg_dump failed with exit code {Code}: {Error}", process.ExitCode, error);
                return false;
            }

            logger.LogInformation("Pre-migration backup written to {File}.", file);
            return true;
        }
        catch (Exception ex) when (ex is Win32Exception or IOException)
        {
            logger.LogWarning(ex, "pg_dump is unavailable; skipping pre-migration backup.");
            return false;
        }
    }
}
