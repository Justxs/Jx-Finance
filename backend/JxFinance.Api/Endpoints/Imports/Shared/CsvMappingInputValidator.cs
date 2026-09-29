using System.Linq.Expressions;
using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.Shared;

public abstract class CsvMappingInputValidator<TRequest> : Validator<TRequest>
    where TRequest : ICsvMappingInput
{
    private static readonly Expression<Func<CsvColumnMap, string?>>[] OptionalColumns =
    [
        c => c.Description,
        c => c.Payee,
        c => c.Amount,
        c => c.Debit,
        c => c.Credit,
        c => c.Direction,
        c => c.ExpenseValue,
        c => c.Currency,
        c => c.Reference,
        c => c.Balance,
        c => c.Fee,
        c => c.Status,
        c => c.BookedValues,
    ];

    protected CsvMappingInputValidator()
    {
        RuleFor(r => r.Name).IsRequired().HasMaxLength(CsvImportMapping.NameMaxLength);
        RuleFor(r => r.Encoding).IsKnownEnum();
        RuleFor(r => r.Delimiter).IsRequired().IsCsvDelimiter();
        RuleFor(r => r.SkipLines).IsWithin(0, CsvImportMapping.MaxSkipLines);
        RuleFor(r => r.AmountStyle).IsKnownEnum();
        RuleFor(r => r.DecimalSeparator).IsKnownEnum();
        RuleFor(r => r.Currency).IsKnownEnum();
        RuleFor(r => r.DateFormat)
            .Must(format => CsvDateFormats.All.Contains(format))
            .WithErrorCode(ErrorCodes.ImportInvalidDateFormat)
            .WithMessage($"The date format is one of {string.Join(", ", CsvDateFormats.All)}.");
        RuleFor(r => r.Columns).IsPresent();
        RuleFor(r => r.Columns).ChildRules(columns =>
        {
            columns.RuleFor(c => c.Date).IsRequired().HasMaxLength(CsvImportMapping.ColumnNameMaxLength);
            foreach (var column in OptionalColumns)
            {
                columns.RuleFor(column).HasMaxLength(CsvImportMapping.ColumnNameMaxLength);
            }
        });
        RuleFor(r => r.Columns)
            .Must((request, columns) => columns is null || columns.Completes(request.AmountStyle))
            .WithErrorCode(ErrorCodes.ImportMappingIncomplete)
            .WithMessage("Name the amount column for a signed amount, the debit and credit columns, or the amount, "
                + "direction and money-out value; a status column also needs the values that mean booked.");
    }
}
