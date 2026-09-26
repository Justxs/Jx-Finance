using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Transactions.Shared;

public static class BulkRules
{
    public const int MaxTransactions = 200;

    public static IRuleBuilderOptions<T, IReadOnlyList<Guid>?> IsBulkSelection<T>(this IRuleBuilder<T, IReadOnlyList<Guid>?> rule, string action) =>
        rule.IsRequired()
            .Must(ids => ids is null || ids.Count <= MaxTransactions)
            .WithErrorCode(ErrorCodes.CollectionInvalidSize)
            .WithMessage($"At most {MaxTransactions} transactions can be {action} at once.");
}
