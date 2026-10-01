using FastEndpoints;
using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.UpdateCsvMapping;

public sealed class UpdateCsvMappingSummary : Summary<UpdateCsvMappingEndpoint, UpdateCsvMappingRequest>
{
    public UpdateCsvMappingSummary()
    {
        Summary = "Update a CSV column mapping";
        Description = "Replaces every setting of a saved mapping, the column names included. Rows already imported keep "
            + "their references. Without a reference column a row's reference is a hash of its date, amount, currency, "
            + "description, payee and balance cells, so changing the description, payee or balance column makes rows "
            + "imported earlier look new.";
        ExampleRequest = new UpdateCsvMappingRequest(
            Guid.Empty,
            "SEB card",
            CsvEncoding.Windows1257,
            ";",
            2,
            CsvAmountStyle.SignedPositiveIsExpense,
            "dd.MM.yyyy",
            CsvDecimalSeparator.Comma,
            new CsvColumnMap { Date = "Data", Description = "Aprašymas", Amount = "Suma" });
        Params["id"] = "The mapping id. Takes precedence over the id in the body.";
        Responses[200] = "The updated mapping.";
        Responses[400] = "Validation failed, the amount style lacks its columns (import.mappingIncomplete), the date format is not one of the list (import.invalidDateFormat) or, without a header row, a column is not a position (text.invalidFormat).";
        Responses[404] = "No such mapping belongs to the signed-in user.";
    }
}
