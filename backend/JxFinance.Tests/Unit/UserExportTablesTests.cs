using System.Text.RegularExpressions;
using JxFinance.Endpoints.Backups.Services;
using JxFinance.Endpoints.Users.Services;
using JxFinance.Infrastructure;
using JxFinance.Infrastructure.Auth;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Unit;

public sealed partial class UserExportTablesTests
{
    [Fact]
    public async Task Every_table_of_the_model_is_classified()
    {
        await using var db = ModelWithPasskeys();

        var tables = BackupDatabase.ReadShapes(db).Select(t => t.Name);

        Assert.Contains("AspNetUserPasskeys", tables);
        Assert.Equal(tables.Order(StringComparer.Ordinal), UserExportTables.Rules.Keys.Order(StringComparer.Ordinal));
    }

    [Fact]
    public async Task The_import_inbox_is_left_out_of_backups_and_the_member_download()
    {
        await using var db = ModelWithPasskeys();

        Assert.False(BackupDatabase.ReadShapes(db).Single(t => t.Name == "ImportInboxFiles").Exported);
        Assert.Null(UserExportTables.Condition("ImportInboxFiles"));
    }

    [Fact]
    public async Task No_exported_column_is_named_like_a_secret()
    {
        await using var db = ModelWithPasskeys();

        var leaked = BackupDatabase.ReadShapes(db)
            .Where(t => UserExportTables.Condition(t.Name) is not null)
            .SelectMany(t => t.Columns
                .Where(c => UserExportTables.Rules[t.Name].Exports(c.Name) && SecretName().IsMatch(c.Name))
                .Select(c => $"{t.Name}.{c.Name}"))
            .ToList();

        Assert.Empty(leaked);
    }

    [Fact]
    public void Every_exported_table_is_imported_or_deliberately_left_out()
    {
        string[] leftOut =
        [
            "AspNetUsers", "BrokerConnections", "DeletionChanges", "DeletionEntries", "MonthCloses", "Notifications",
            "Settlements", "SharedExpenseShares", "SharedExpenses",
        ];

        var exported = UserExportTables.Rules.Keys.Where(table => UserExportTables.Condition(table) is not null);

        Assert.Equal(
            exported.Order(StringComparer.Ordinal),
            MemberImport.Imported.Concat(leftOut).Order(StringComparer.Ordinal));
    }

    [Fact]
    public void Every_included_table_is_narrowed_to_the_member()
    {
        var unbound = UserExportTables.Rules.Keys
            .Where(table => UserExportTables.Condition(table) is { } condition && !condition.Contains(UserExportTables.User, StringComparison.Ordinal))
            .ToList();

        Assert.Empty(unbound);
        Assert.Null(UserExportTables.Condition("AspNetUserTokens"));
        Assert.Null(UserExportTables.Condition("AspNetUserPasskeys"));
        Assert.Null(UserExportTables.Condition("PersonalApiTokens"));
    }

    private static AppDbContext ModelWithPasskeys()
    {
        var identity = new ServiceCollection()
            .Configure<IdentityOptions>(DependencyInjection.ConfigureIdentity)
            .BuildServiceProvider();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=unused.invalid;Database=unused")
            .UseApplicationServiceProvider(identity)
            .EnableServiceProviderCaching(false)
            .Options;
        return new AppDbContext(options, new FixedUser(Guid.NewGuid()), new TestClock());
    }

    [GeneratedRegex("Password|Stamp|Token|Secret|Webhook|Credential|Protected|Authenticator|Recovery|PublicKey|Hash")]
    private static partial Regex SecretName();
}
