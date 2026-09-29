using FastEndpoints;

namespace JxFinance.Endpoints.Imports.ListCsvMappings;

public sealed class ListCsvMappingsSummary : Summary<ListCsvMappingsEndpoint>
{
    public ListCsvMappingsSummary()
    {
        Summary = "List CSV column mappings";
        Description = "Returns your saved CSV column mappings by name. The import dialog lists each one as a provider "
            + "next to Swedbank and camt.053. Mappings are personal: nobody else sees them.";
        Responses[200] = "The mappings of the signed-in user, by name.";
    }
}
