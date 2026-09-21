using FastEndpoints;

namespace JxFinance.Endpoints.Attachments.GetAttachments;

public sealed class GetAttachmentsSummary : Summary<GetAttachmentsEndpoint>
{
    public GetAttachmentsSummary()
    {
        Summary = "List the files of a transaction";
        Description = "Returns the receipts and documents attached to one transaction, oldest first, with "
            + "their sanitized file name, detected content type, size, SHA-256 and who uploaded them. "
            + "Anyone who can see the transaction sees its files: the owner of the account and, for a "
            + "shared account, every member of its household, narrowed by the active household like the "
            + "transaction itself. Files in the trash are left out.";
        Params["transactionId"] = "The transaction id.";
        Responses[200] = "The files of the transaction.";
        Responses[404] = "No such transaction is visible to the signed-in user.";
    }
}
