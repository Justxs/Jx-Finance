using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Infrastructure.Data;

public static class StarterCategories
{
    private static readonly (string Name, FlowType Type, string Icon)[] Defaults =
    [
        ("Salary", FlowType.Income, "banknote"),
        ("Other income", FlowType.Income, "coins"),
        ("Food", FlowType.Expense, "utensils"),
        ("Rent", FlowType.Expense, "home"),
        ("Utilities", FlowType.Expense, "lightbulb"),
        ("Transport", FlowType.Expense, "car"),
        ("Entertainment", FlowType.Expense, "clapperboard"),
        ("Health", FlowType.Expense, "heart-pulse"),
        ("Shopping", FlowType.Expense, "shopping-bag"),
        ("Other", FlowType.Expense, "shapes"),
    ];

    public static int Count => Defaults.Length;

    public static async Task SeedAsync(AppDbContext db, Guid userId, CancellationToken cancellationToken)
    {
        if (await db.Categories.IgnoreQueryFilters().AnyAsync(c => c.UserId == userId, cancellationToken)) return;
        await AddAsync(db, userId, cancellationToken);
    }

    public static async Task AddAsync(AppDbContext db, Guid userId, CancellationToken cancellationToken)
    {
        db.Categories.AddRange(Defaults.Select(starter => new Category
        {
            UserId = userId,
            Name = starter.Name,
            Type = starter.Type,
            Icon = starter.Icon,
            IsDefault = true,
        }));
        await db.SaveChangesAsync(cancellationToken);
    }
}
