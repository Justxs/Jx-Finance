using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.GetPlaces;

public sealed class GetPlacesSummary : Summary<GetPlacesEndpoint, GetPlacesRequest>
{
    public GetPlacesSummary()
    {
        Summary = "Suggest places used before";
        Description = "Answers up to 20 distinct places of the transactions you can see, narrowed by the active household, "
            + "most used first. Places that differ only in case or surrounding spaces are one entry, named by the newest spelling, "
            + "with the number of transactions and the average of the coordinates stored with them (null when none has any). "
            + "With lat and lon, the nearest place within 150 metres comes first with nearby true, so a position taken in a shop "
            + "can be named after the shop. Nothing is looked up outside the installation. Needs the locations feature.";
        RequestParam(r => r.Search, "Optional text the place must contain, ignoring case, at most 120 characters.");
        RequestParam(r => r.Lat, "Optional latitude from -90 to 90, sent together with lon.");
        RequestParam(r => r.Lon, "Optional longitude from -180 to 180, sent together with lat.");
        Responses[200] = "The suggested places.";
        Responses[400] = "Validation failed, or lat and lon are out of range or come alone (transaction.locationInvalid).";
        Responses[404] = "The locations feature is switched off (feature.disabled).";
    }
}
