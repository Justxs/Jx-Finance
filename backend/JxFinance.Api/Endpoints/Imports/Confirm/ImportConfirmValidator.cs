using FastEndpoints;
using FluentValidation;
using JxFinance.Common;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed class ImportConfirmValidator : Validator<ImportConfirmRequest>
{
    public ImportConfirmValidator()
    {
        RuleFor(r => r.AccountId).NotEmpty();
        RuleFor(r => r.Rows).NotNull().Must(rows => rows is { Count: > 0 and <= 10000 });
        RuleForEach(r => r.Rows).ChildRules(row =>
        {
            row.RuleFor(r => r.ImportRef).NotEmpty().MaximumLength(64);
            row.RuleFor(r => r.Date).NotEmpty();
            row.RuleFor(r => r.Type).IsInEnum();
            row.RuleFor(r => r.Currency).IsInEnum();
            row.RuleFor(r => r.Description).MaximumLength(500);
            row.RuleFor(r => r.Amount).Must(MoneyWire.IsPositive);
        });
    }
}
