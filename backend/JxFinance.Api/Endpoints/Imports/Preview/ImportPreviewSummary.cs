using FastEndpoints;

namespace JxFinance.Endpoints.Imports.Preview;

public sealed class ImportPreviewSummary : Summary<ImportPreviewEndpoint, ImportPreviewRequest>
{
    public ImportPreviewSummary()
    {
        Summary = "Preview a Swedbank CSV statement";
        Description = "Parses an exported Swedbank statement and returns the rows it found, each with "
            + "a suggested category and a flag saying whether a matching transaction already exists in "
            + "the account. Nothing is written: this call only reads the file, and the client decides "
            + "which rows to keep before calling confirm. Send the file as multipart/form-data.";
        Params["file"] = "The statement as a CSV file, at most 5 MB.";
        Params["accountId"] = "The account the statement belongs to.";
        Responses[200] = "The parsed rows, with suggestions and duplicate flags.";
        Responses[400] = "No file, a file over 5 MB, an unreadable statement, or an account that is not yours.";
    }
}
