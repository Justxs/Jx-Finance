using JxFinance.Common;
using JxFinance.Common.CategoryAttributions;
using JxFinance.Domain.Common;
using JxFinance.Infrastructure.Data;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Reports;

[Collection<IntegrationCollection>]
public sealed class CategoryAttributionTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private static readonly DateOnly Start = new(2026, 4, 1);
    private static readonly DateOnly End = new(2026, 5, 1);

    [Fact]
    public async Task Totals_grouped_in_sql_equal_the_row_by_row_totals_to_the_cent()
    {
        var user = await CreateUserAsync();
        using var client = await LoginAsync(user);
        var euros = await CreateAccountAsync("1000.00", currency: "eur", client: client);
        var dollars = await CreateAccountAsync("1000.00", currency: "usd", client: client);
        var pounds = await CreateAccountAsync("1000.00", currency: "gbp", client: client);
        var food = await CreateCategoryAsync(client: client);
        var travel = await CreateCategoryAsync(client: client);

        await RecordTransactionAsync(client, new { accountId = euros, categoryId = food, type = "expense", amount = "10.00", date = "2026-04-02" });
        await RecordTransactionAsync(client, new { accountId = euros, categoryId = food, type = "expense", amount = "0.01", date = "2026-04-02" });
        await RecordTransactionAsync(client, new { accountId = dollars, categoryId = food, type = "expense", amount = "11.00", date = "2026-04-03" });
        await RecordTransactionAsync(client, new { accountId = pounds, categoryId = food, type = "expense", amount = "8.00", date = "2026-04-04" });
        await RecordTransactionAsync(client, new { accountId = dollars, categoryId = travel, type = "expense", amount = "33.33", date = "2026-04-05" });
        await RecordTransactionAsync(client, new { accountId = euros, type = "expense", amount = "5.55", date = "2026-04-06" });
        await RecordTransactionAsync(client, new { accountId = euros, type = "income", amount = "100.00", date = "2026-04-06" });
        await RecordTransactionAsync(client, new { accountId = euros, categoryId = food, type = "expense", amount = "999.00", date = "2026-05-01" });
        await RecordTransactionAsync(
            client,
            new
            {
                accountId = dollars,
                type = "expense",
                amount = "11.00",
                date = "2026-04-07",
                lines = new object[]
                {
                    new { categoryId = food, amount = "3.30" },
                    new { categoryId = travel, amount = "3.30" },
                    new { categoryId = (Guid?)null, amount = "4.40" },
                },
            });

        using var scope = Services.CreateScope();
        await using var db = new AppDbContext(
            scope.ServiceProvider.GetRequiredService<DbContextOptions<AppDbContext>>(),
            new TestCurrentUser(user.Id));

        var grouped = Totals(await new CategoryAttributionService(db)
            .GetAttributionsAsync(new DateWindow(Start, End), null, FlowType.Expense, default));
        var rowByRow = Totals(await RowByRowAsync(db));

        Assert.Equal(rowByRow, grouped);
        Assert.Equal(
            new Dictionary<Guid, decimal> { [food] = 33.01m, [travel] = 33.30m, [Guid.Empty] = 9.55m },
            grouped);
    }

    private static async Task<List<CategoryAttribution>> RowByRowAsync(AppDbContext db)
    {
        var transactions = await db.Transactions
            .Where(t => t.Type == FlowType.Expense && t.Date >= Start && t.Date < End)
            .ToListAsync();
        var attributions = transactions
            .Where(t => !t.IsSplit)
            .Select(t => new CategoryAttribution(t.Date, t.CategoryId, t.ReportingAmount))
            .ToList();

        foreach (var split in transactions.Where(t => t.IsSplit))
        {
            var lines = await db.TransactionLines.Where(l => l.TransactionId == split.Id).OrderBy(l => l.Id).ToListAsync();
            var remaining = split.ReportingAmount;
            for (var i = 0; i < lines.Count; i++)
            {
                var share = i == lines.Count - 1
                    ? remaining
                    : Money.Round(lines[i].Amount.Amount * split.ReportingAmount / split.Amount.Amount);
                remaining -= share;
                attributions.Add(new CategoryAttribution(split.Date, lines[i].CategoryId, share));
            }
        }

        return attributions;
    }

    private static Dictionary<Guid, decimal> Totals(IEnumerable<CategoryAttribution> attributions) =>
        attributions
            .GroupBy(a => a.CategoryId)
            .ToDictionary(g => g.Key?.Value ?? Guid.Empty, g => g.Sum(a => a.Amount));
}
