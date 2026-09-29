using FastEndpoints;

namespace JxFinance.Endpoints.Imports.InspectCsv;

public sealed class InspectCsvSummary : Summary<InspectCsvEndpoint, InspectCsvRequest>
{
    public InspectCsvSummary()
    {
        Summary = "Inspect a CSV file for a column mapping";
        Description = "Reads a CSV export from any bank, card issuer or payment app and proposes how to read it: the text "
            + "encoding (a byte-order mark decides UTF-8 or UTF-16, otherwise windows1257 is proposed when the bytes are not "
            + "valid UTF-8), the delimiter (comma, semicolon, tab or pipe) and how many lines sit above the header row. It "
            + "returns the header names, up to ten sample rows of raw cells, and for each column the date formats that read "
            + "every sample and the decimal separator its numbers use. matchingMappingIds lists your saved mappings whose "
            + "every named column is in this header, so the client can offer one. Send encoding, delimiter or skipLines to "
            + "read the file again after the user corrected a proposal. Nothing is written. Send the file as multipart/form-data.";
        Params["file"] = "The CSV file, at most 5 MB.";
        Params["encoding"] = "Optional. The encoding to read the file with when it has no byte-order mark: utf8, windows1257 or windows1252.";
        Params["delimiter"] = "Optional. The delimiter: a comma, semicolon, tab or pipe.";
        Params["skipLines"] = "Optional. How many non-empty lines sit above the header row, 0 to 20.";
        Responses[200] = "The proposals, the header, the sample rows and the saved mappings that fit.";
        Responses[400] = "No file, a file over 5 MB, a file with no header row and data (import.invalidFile), or an invalid option.";
    }
}
