using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;

namespace JxFinance.Common.Unusual;

public sealed record UnusualCandidate(
    AccountId AccountId,
    CategoryId? CategoryId,
    DateOnly Date,
    decimal ReportingAmount,
    string? Description);
