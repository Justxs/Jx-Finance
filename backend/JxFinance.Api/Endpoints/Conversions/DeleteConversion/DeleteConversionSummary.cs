using FastEndpoints;

namespace JxFinance.Endpoints.Conversions.DeleteConversion;

public sealed class DeleteConversionSummary : Summary<DeleteConversionEndpoint>
{
    public DeleteConversionSummary()
    {
        Summary = "Delete a currency conversion";
        Description = "Removes the conversion and the fee transaction it created, restoring both balances.";
        Responses[204] = "The conversion was deleted.";
        Responses[404] = "No conversion with that id is visible to you.";
    }
}
