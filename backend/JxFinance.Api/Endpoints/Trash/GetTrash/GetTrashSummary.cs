using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Trash;

namespace JxFinance.Endpoints.Trash.GetTrash;

public sealed class GetTrashSummary : Summary<GetTrashEndpoint, GetTrashRequest>
{
    public GetTrashSummary()
    {
        Summary = "List what you deleted recently";
        Description = "Returns a page of the records the signed-in user deleted in the last "
            + $"{DeletionEntry.RetentionDays} days and has not restored, newest first. Each row names the "
            + "kind of record, the words it was known by when it was deleted and the moment it went. "
            + "Only the caller's own deletions are listed, even on a shared account: somebody else's "
            + "delete is theirs to undo. A kind whose feature is switched off is left out. Nothing here "
            + "is a promise that the record can still come back — a row whose account was archived "
            + "afterwards is still listed and explains itself when restoring is attempted.";
        this.DescribePaging();
        Responses[200] = "A page of deleted records with the total row count.";
    }
}
