using JxFinance.Domain.Categories;

namespace JxFinance.Common.CategoryAttributions;

public sealed record CategoryAttribution(DateOnly Date, CategoryId? CategoryId, decimal Amount);
