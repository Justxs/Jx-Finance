using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed class ImportConfirmValidator : Validator<ImportConfirmRequest>
{
    public ImportConfirmValidator()
    {
        RuleFor(r => r.AccountId).IsRequired();
        RuleFor(r => r.Format).IsKnownEnum();
        RuleFor(r => r.Rows)
            .IsPresent()
            .Must(rows => rows is { Count: > 0 and <= 10000 })
            .WithErrorCode(ErrorCodes.CollectionInvalidSize);
        RuleForEach(r => r.Rows).ChildRules(row =>
        {
            row.RuleFor(r => r.ImportRef).IsRequired().HasMaxLength(64);
            row.RuleFor(r => r.Date).IsRequired();
            row.RuleFor(r => r.Type).IsKnownEnum();
            row.RuleFor(r => r.Currency).IsKnownEnum();
            row.RuleFor(r => r.Description).HasMaxLength(500);
            row.RuleFor(r => r.Amount).IsPositiveMoney();
            row.RuleFor(r => r.TagIds).HasAtMostTags();
        });
        RuleFor(r => r.Statement!).ChildRules(statement =>
        {
            statement.RuleFor(s => s.ClosingDate).IsRequired();
            statement.RuleFor(s => s.ClosingBalance).IsMoney();
            statement.RuleFor(s => s.ClosingCurrency).IsKnownEnum();
        });
    }
}
