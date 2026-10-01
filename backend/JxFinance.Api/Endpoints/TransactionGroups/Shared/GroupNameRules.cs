using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Transactions;

namespace JxFinance.Endpoints.TransactionGroups.Shared;

public static class GroupNameRules
{
    public static IRuleBuilderOptions<T, string?> IsGroupName<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Must(name => !string.IsNullOrWhiteSpace(name))
            .WithErrorCode(ErrorCodes.TextTooShort)
            .WithMessage("A group needs a name.")
            .HasMaxLength(TransactionGroup.NameMaxLength);
}
