using FastEndpoints;
using JxFinance.Domain.Trash;

namespace JxFinance.Endpoints.Trash.RestoreDeleted;

public sealed class RestoreDeletedSummary : Summary<RestoreDeletedEndpoint, RestoreDeletedRequest>
{
    public RestoreDeletedSummary()
    {
        Summary = "Restore a deleted record";
        Description = "Brings back the record the signed-in user deleted, named by its kind and its own "
            + "id rather than by a trash row id, so the toast that appears right after a delete and the "
            + "trash screen call the same operation. A record that is already back answers 204 again, "
            + "which makes the call safe to repeat. Restoring a transaction brings its split lines and "
            + "its tags with it, because deleting never removed them; restoring a currency conversion "
            + "brings back the fee transaction that went with it. The record has to be visible again to "
            + "come back: an archived account, a deleted category or a fee transaction that was deleted "
            + "on its own each refuse with their own code instead of restoring something broken.";
        ExampleRequest = new RestoreDeletedRequest(TrashKind.Transaction, Guid.Empty);
        RequestParam(r => r.Kind, "Which kind of record to bring back, as listed by GET /api/trash.");
        RequestParam(r => r.EntityId, "The id the record had before it was deleted.");
        Responses[204] = "The record is back, or was already back.";
        Responses[400] = $"Validation failed; the deletion is older than {DeletionEntry.RetentionDays} days "
            + "(restore.expired); the account or category it needs is gone (restore.referenceMissing); the "
            + "fee transaction of a conversion was deleted on its own (restore.companionDeleted); or the "
            + "split lines of the transaction are no longer stored (restore.detailsLost).";
        Responses[404] = "Nothing the signed-in user deleted matches that kind and id, or the feature it belongs to is switched off.";
        Responses[409] = "Another record already holds the place this one needs, such as a budget on the same category and period (restore.slotTaken).";
    }
}
