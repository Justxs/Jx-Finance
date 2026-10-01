using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Imports;
using JxFinance.Endpoints.Imports.Parsing;

namespace JxFinance.Endpoints.Imports.Preview;

public sealed class ImportPreviewValidator : Validator<ImportPreviewRequest>
{
    public ImportPreviewValidator()
    {
        RuleFor(r => r.Format).IsKnownEnum();
        RuleFor(r => r.MappingId).IsPresent().When(r => r.Format == StatementFormat.GenericCsv);
        RuleFor(r => r.File)
            .Must((request, file) => file is { Length: > 0 } && file.Length <= StatementReader.MaxBytes(request.Format))
            .WithErrorCode(ErrorCodes.ImportInvalidFile)
            .WithMessage("Choose a non-empty file, at most 5 MB for a CSV statement or 20 MB for an XML statement.");
    }
}
