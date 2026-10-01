using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.RenamePlace;

public sealed class RenamePlaceSummary : Summary<RenamePlaceEndpoint, RenamePlaceRequest>
{
    public RenamePlaceSummary()
    {
        Summary = "Rename a place or merge several spellings into one";
        Description = "Sets the place of every transaction you entered whose place matches one of the listed places, "
            + "ignoring case and surrounding spaces, to the new name, in one step. Renaming is one place in the list; "
            + "merging is several. Rows a housemate entered on a shared account keep their place, the coordinates of every row "
            + "stay as they are, and the rows' last-changed time is not moved, so a closed month does not drift. When rows on "
            + "shared accounts change, the household's activity log gains one line that counts them. Needs the locations feature.";
        ExampleRequest = new RenamePlaceRequest(["Maxima Ozo", "maxima, ozo g. 18"], "Maxima, Ozo g. 18");
        RequestParam(r => r.Places, $"Between 1 and {RenamePlaceRequest.MaxPlaces} places as the place list shows them, each at most 120 characters.");
        RequestParam(r => r.Name, "The place the rows should read, trimmed, at most 120 characters.");
        Responses[200] = "The number of transactions whose place changed.";
        Responses[400] = "Validation failed: no places, too many, or an empty or too long place or name.";
        Responses[404] = "The locations feature is switched off (feature.disabled).";
    }
}
