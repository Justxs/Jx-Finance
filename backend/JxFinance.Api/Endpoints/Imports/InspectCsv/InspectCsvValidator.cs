using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.InspectCsv;

public sealed class InspectCsvValidator : Validator<InspectCsvRequest>
{
    public InspectCsvValidator()
    {
        RuleFor(r => r.File)
            .Must(file => file is { Length: > 0 and <= CsvMappingRules.MaxFileBytes })
            .WithErrorCode(ErrorCodes.ImportInvalidFile)
            .WithMessage("Choose a non-empty CSV file of at most 5 MB.");
        RuleFor(r => r.Encoding).IsKnownEnum();
        RuleFor(r => r.Delimiter).IsCsvDelimiter();
        RuleFor(r => r.SkipLines).IsWithin(0, CsvImportMapping.MaxSkipLines);
    }
}
