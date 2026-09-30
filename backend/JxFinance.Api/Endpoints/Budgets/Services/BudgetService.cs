using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Errors;
using JxFinance.Common.References;
using JxFinance.Common.Settings;
using JxFinance.Common.Trash;
using JxFinance.Domain.Budgets;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Tags;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Budgets.CreateBudget;
using JxFinance.Endpoints.Budgets.Interfaces;
using JxFinance.Endpoints.Budgets.Mappers;
using JxFinance.Endpoints.Budgets.Shared;
using JxFinance.Endpoints.Budgets.UpdateBudget;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Budgets.Services;

[RegisterService<IBudgetService>(LifeTime.Scoped)]
public sealed class BudgetService(
    AppDbContext db,
    IBudgetUsageCalculator usageCalculator,
    IReferenceGuard references,
    IDeletionRecorder deletions,
    IInstanceSettingsStore settings,
    IClock clock)
    : IBudgetService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("Budget not found.");

    public async Task<IReadOnlyList<BudgetResponse>> GetAllAsync(DateOnly? asOf, CancellationToken cancellationToken)
    {
        var budgets = await db.Budgets.ToListAsync(cancellationToken);
        return budgets.Count == 0 ? [] : await ToResponsesAsync(budgets, asOf ?? clock.Today, cancellationToken);
    }

    public async Task<IReadOnlyList<BudgetResponse>> GetMonthlyAsync(DateOnly asOf, CancellationToken cancellationToken)
    {
        var budgets = await db.Budgets.Where(b => b.Period == BudgetPeriod.Monthly).ToListAsync(cancellationToken);
        return budgets.Count == 0 ? [] : await ToResponsesAsync(budgets, asOf, cancellationToken);
    }

    public async Task<Result<BudgetResponse>> CreateAsync(
        CreateBudgetRequest request,
        CancellationToken cancellationToken)
    {
        var error = await ValidateAsync(request, null, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        var budget = request.ToEntity(settings.Current.ReportingCurrency);

        db.Budgets.Add(budget);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(budget, cancellationToken);
    }

    public async Task<Result<BudgetResponse>> UpdateAsync(
        UpdateBudgetRequest request,
        CancellationToken cancellationToken)
    {
        var budgetId = new BudgetId(request.Id);
        if (await db.Budgets.FirstOrDefaultAsync(b => b.Id == budgetId, cancellationToken) is not { } budget)
        {
            return NotFound;
        }

        var error = await ValidateAsync(request, budgetId, cancellationToken);
        if (error is not null)
        {
            return error;
        }

        request.ApplyTo(budget, settings.Current.ReportingCurrency);
        await db.SaveChangesAsync(cancellationToken);

        return await ToResponseAsync(budget, cancellationToken);
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var budgetId = new BudgetId(id);
        return db.DeleteOrNotFoundAsync<Budget>(
            id,
            b => b.Id == budgetId,
            NotFound,
            async budget =>
            {
                var names = await NamesAsync([budget], cancellationToken);
                deletions.Record(TrashKind.Budget, id, $"{NameOf(budget, names) ?? budget.Period.ToString()}, {TrashLabel.Amount(budget.LimitAmount)}");
                return null;
            },
            cancellationToken);
    }

    private async Task<DomainError?> ValidateAsync(
        IBudgetInput input,
        BudgetId? excluding,
        CancellationToken cancellationToken)
    {
        if (input.TagId is { } tag)
        {
            var tagId = new TagId(tag);
            return await references.TagsExistAsync([tag], cancellationToken)
                ?? await TakenAsync(b => b.TagId == tagId, "tag", input.Period, excluding, cancellationToken);
        }

        var categoryId = new CategoryId(input.CategoryId!.Value);
        return await references.CategoryOfTypeAsync(
                categoryId,
                FlowType.Expense,
                "Budgets can only be set on expense categories.",
                cancellationToken)
            ?? await TakenAsync(b => b.CategoryId == categoryId, "category", input.Period, excluding, cancellationToken);
    }

    private async Task<DomainError?> TakenAsync(
        System.Linq.Expressions.Expression<Func<Budget, bool>> sameTarget,
        string target,
        BudgetPeriod period,
        BudgetId? excluding,
        CancellationToken cancellationToken)
    {
        var taken = await db.Budgets
            .Where(sameTarget)
            .AnyAsync(b => b.Period == period && (excluding == null || b.Id != excluding), cancellationToken);

        return taken
            ? new DomainError(
                ErrorCodes.ConflictDuplicate,
                $"That {target} already has a {period.ToString().ToLowerInvariant()} budget.")
            : null;
    }

    private async Task<Result<BudgetResponse>> ToResponseAsync(Budget budget, CancellationToken cancellationToken) =>
        (await ToResponsesAsync([budget], clock.Today, cancellationToken))[0];

    private async Task<List<BudgetResponse>> ToResponsesAsync(
        List<Budget> budgets,
        DateOnly asOf,
        CancellationToken cancellationToken)
    {
        var usage = await usageCalculator.CalculateAsync(budgets, asOf, cancellationToken);
        var names = await NamesAsync(budgets, cancellationToken);

        return budgets.Select(b => b.ToResponse(NameOf(b, names), usage[b.Id])).ToList();
    }

    private async Task<BudgetTargetNames> NamesAsync(IReadOnlyList<Budget> budgets, CancellationToken cancellationToken)
    {
        var categoryIds = budgets.Select(b => b.CategoryId).OfType<CategoryId>().Distinct().ToList();
        var tagIds = budgets.Select(b => b.TagId).OfType<TagId>().Distinct().ToList();
        return new BudgetTargetNames(
            await db.Categories
                .Where(c => categoryIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Name, cancellationToken),
            await db.Tags
                .Where(t => tagIds.Contains(t.Id))
                .ToDictionaryAsync(t => t.Id, t => t.Name, cancellationToken));
    }

    private static string? NameOf(Budget budget, BudgetTargetNames names) =>
        budget.TagId is { } tagId
            ? names.Tags.GetValueOrDefault(tagId)
            : names.Categories.GetValueOrDefault(budget.CategoryId!.Value);

    private sealed record BudgetTargetNames(
        Dictionary<CategoryId, string> Categories,
        Dictionary<TagId, string> Tags);
}
