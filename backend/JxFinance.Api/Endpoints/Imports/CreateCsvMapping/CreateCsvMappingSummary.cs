using FastEndpoints;
using JxFinance.Domain.Imports;

namespace JxFinance.Endpoints.Imports.CreateCsvMapping;

public sealed class CreateCsvMappingSummary : Summary<CreateCsvMappingEndpoint, CreateCsvMappingRequest>
{
    public CreateCsvMappingSummary()
    {
        Summary = "Save a CSV column mapping";
        Description = "Saves how to read one bank's CSV export, so its next file goes straight to the preview with "
            + "format genericCsv and this mapping's id. Columns are named by their header text, or by their position from 1 when "
            + "noHeaderRow is true. The amount style decides "
            + "which columns carry the money: signedNegativeIsExpense and signedPositiveIsExpense read one signed amount "
            + "column (the second for card statements, where a positive amount is a purchase), debitCredit reads a debit and "
            + "a credit column, and amountWithDirection reads an amount and a direction column whose value equals "
            + "expenseValue, ignoring case, for money out. A mapping is personal: nobody else sees it.";
        ExampleRequest = new CreateCsvMappingRequest(
            "Revolut",
            CsvEncoding.Utf8,
            ",",
            0,
            CsvAmountStyle.SignedNegativeIsExpense,
            "yyyy-MM-dd",
            CsvDecimalSeparator.Dot,
            new CsvColumnMap
            {
                Date = "Completed Date",
                Description = "Description",
                Amount = "Amount",
                Fee = "Fee",
                Currency = "Currency",
                Balance = "Balance",
                Status = "State",
                BookedValues = "COMPLETED",
            });
        RequestParam(r => r.Name, "What the provider list calls the mapping, at most 60 characters.");
        RequestParam(r => r.Encoding, "The encoding of a file without a byte-order mark: utf8, windows1257 or windows1252.");
        RequestParam(r => r.Delimiter, "A comma, a semicolon, a tab or a pipe.");
        RequestParam(r => r.SkipLines, "How many non-empty lines sit above the header row, 0 to 20.");
        RequestParam(r => r.AmountStyle, "How the amount columns say which way the money moved.");
        RequestParam(r => r.DateFormat, "One of yyyy-MM-dd, dd.MM.yyyy, dd/MM/yyyy, MM/dd/yyyy, dd-MM-yyyy, yyyy.MM.dd, yyyy/MM/dd or d.M.yyyy. A time after a space or T is ignored.");
        RequestParam(r => r.DecimalSeparator, "The decimal mark of the numbers, dot or comma; the other one is read as a thousands mark.");
        RequestParam(r => r.Columns, "The header names of the columns to read. date is required, and the amount style needs its columns. bookedValues is a comma-separated list of the status values that mean booked.");
        RequestParam(r => r.Currency, "Optional. The currency of every row when the file has no currency column; the account's currency when left out.");
        RequestParam(r => r.NoHeaderRow, "Optional, false by default. True for a file without a header row: every column is then named by its position, 1 for the first, and the lines skipped sit above the first entry.");
        Responses[201] = "The mapping was saved. The Location header points at it.";
        Responses[400] = "Validation failed, the amount style lacks its columns (import.mappingIncomplete), the date format is not one of the list (import.invalidDateFormat) or, without a header row, a column is not a position (text.invalidFormat).";
    }
}
