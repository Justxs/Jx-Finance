using JxFinance.Domain.Categories;

namespace JxFinance.Common.CategoryAttributions;

public sealed record CategoryAttribution(CategoryId? CategoryId, decimal Amount);
