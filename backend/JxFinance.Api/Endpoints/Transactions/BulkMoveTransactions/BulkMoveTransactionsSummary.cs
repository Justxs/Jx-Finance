using FastEndpoints;

namespace JxFinance.Endpoints.Transactions.BulkMoveTransactions;

public sealed class BulkMoveTransactionsSummary
    : Summary<BulkMoveTransactionsEndpoint, BulkMoveTransactionsRequest>
{
    public BulkMoveTransactionsSummary()
    {
        Summary = "Move several transactions to another account";
        Description = "Puts every listed transaction on the account sent, as changing the account in the "
            + "transaction form does: the amount, currency, date, category, split lines, tags, files, refund "
            + "link, group and import reference stay, so the reporting amount needs no revaluation, and an "
            + "imported row keeps guarding its new account against being imported twice. Rows already on that "
            + "account are left alone and not counted. A row whose link would no longer hold stays where it "
            + "is and is listed in refused with its code: the fee of a currency conversion "
            + "(transaction.conversionFee), an expense split with a household when its payer does not own "
            + "the account (settleUp.notPayer), and a payment of a shared debt when the account is not shared "
            + "with the debt's household (household.referenceNotShared). Split rows and members of a "
            + "transaction group move like any other row. An invisible id or account refuses the whole "
            + "request. Repeated ids count once. A read-and-write API token cannot call it.";
        ExampleRequest = new BulkMoveTransactionsRequest([Guid.Empty], Guid.Empty);
        RequestParam(r => r.TransactionIds, "Between 1 and 200 transaction ids.");
        RequestParam(r => r.AccountId, "The account the transactions should be on, one you can see.");
        Responses[200] = "How many transactions moved, and which stayed where they were and why.";
        Responses[400] = "Validation failed, or the account is not visible to you (reference.notFound).";
        Responses[404] = "At least one listed transaction is not visible to the signed-in user.";
    }
}
