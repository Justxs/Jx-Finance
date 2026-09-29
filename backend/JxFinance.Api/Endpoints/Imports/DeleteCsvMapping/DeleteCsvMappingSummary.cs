using FastEndpoints;

namespace JxFinance.Endpoints.Imports.DeleteCsvMapping;

public sealed class DeleteCsvMappingSummary : Summary<DeleteCsvMappingEndpoint>
{
    public DeleteCsvMappingSummary()
    {
        Summary = "Delete a CSV column mapping";
        Description = "Removes a saved mapping from the provider list. Rows imported through it stay as they are. The "
            + "deletion is listed in the trash, and POST /api/trash/restore brings the mapping back.";
        Params["id"] = "The mapping id.";
        Responses[204] = "The mapping is gone.";
        Responses[404] = "No such mapping belongs to the signed-in user.";
    }
}
