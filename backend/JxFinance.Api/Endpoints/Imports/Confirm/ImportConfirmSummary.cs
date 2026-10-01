using FastEndpoints;
using JxFinance.Endpoints.Imports.Shared;

namespace JxFinance.Endpoints.Imports.Confirm;

public sealed class ImportConfirmSummary : Summary<ImportConfirmEndpoint, ImportConfirmRequest>
{
    public ImportConfirmSummary()
    {
        Summary = "Commit previewed statement rows";
        Description = "Writes the rows the user kept from a preview into the ledger. Rows the preview "
            + "flagged as already present are skipped rather than duplicated, and the response reports "
            + "how many were imported and how many were skipped. A row's tagIds are written as they "
            + "arrive, whether a rule suggested them in the preview or the user picked them, so an "
            + "empty list imports the row with no tags. A row with existingTransactionId adds nothing: "
            + "the bank entry is linked to that transaction, which keeps its date, category, tags and "
            + "description and is then treated as imported, so the same entry is a duplicate next time. "
            + "The audit entry names the format the rows came from, and for genericCsv the mapping. For a camt.053 file or a mapped CSV with a balance column, statement echoes the "
            + "preview's closing date, balance and currency, and that balance is "
            + "recorded as a reconciliation of the account in that currency after the rows are written, replacing one on the same date and currency, "
            + "and returned with its difference from the ledger. An incoming row sent with asRefund is written as a refund: an expense "
            + "with the negated amount in the expense category given, linked to refundOfTransactionId when that is set. A row written as a transaction may carry "
            + "spreadMonths and spreadDirection, which spread it over months as on a transaction created by hand; a transfer or a linked row "
            + "cannot be spread (value.mustBeEmpty). With group, every row written as a transaction and every linked row is put in "
            + "one transaction group in the same database transaction: an existing group by id, under the rules of POST "
            + "/api/transaction-groups/{id}/members, or a new group by name, shared with the household of the account when the "
            + "account is shared and personal otherwise. Transfers and skipped duplicates are not grouped, and nothing is written "
            + "when the group refuses a row.";
        RequestParam(r => r.AccountId, "The account the rows post to; must be the one previewed.");
        RequestParam(r => r.Rows, "The rows to import, as returned by preview, with any category and tag corrections applied.");
        RequestParam(r => r.Format, ImportFormatText.Format);
        RequestParam(r => r.MappingId, "The saved CSV column mapping the preview used; required for genericCsv, whose audit entry names it.");
        RequestParam(r => r.Statement, "Optional. The closing balance the camt.053 or mapped CSV preview answered; ignored for Swedbank CSV.");
        RequestParam(r => r.Group, "Optional. The group to put the imported rows in: id of an existing group, or name of a new one, 1 to 120 characters.");
        Responses[200] = "Counts of imported, linked and skipped rows, and the recorded reconciliation when there is one.";
        Responses[400] = "Validation failed, a tag is not visible to you, the account is not visible to the signed-in user, "
            + "or a transaction to link no longer matches its bank entry or is already linked (import.entryMismatch), asRefund was sent on a row "
            + "that is not an incoming transaction (import.refundInvalid), or the refunded purchase is not a visible expense (transaction.refundOriginalInvalid), or the group is shared and the account is not "
            + "shared with its household (household.referenceNotShared).";
        Responses[403] = "The group is personal and a linked row was entered by someone else.";
        Responses[404] = "The group is not visible to you.";
        Responses[409] = "A linked row is already in another group (transactionGroup.memberTaken).";
    }
}
