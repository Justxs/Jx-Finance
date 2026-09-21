using FastEndpoints;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.CreateRecurringBill;

public sealed class CreateRecurringBillSummary : Summary<CreateRecurringBillEndpoint, CreateRecurringBillRequest>
{
    public CreateRecurringBillSummary()
    {
        Summary = "Create a recurring entry";
        Description = "Schedules a recurring expense, a recurring income or a recurring transfer. Nothing "
            + "is posted to the ledger on a schedule: the background job raises a reminder before the due "
            + "date, and a transaction or a transfer is only written once the occurrence is confirmed.";
        ExampleRequest = new CreateRecurringBillRequest(
            "Rent",
            RecurringBillShape.Expense,
            RecurringBillKind.Fixed,
            650.00m,
            null,
            null,
            null,
            RecurringBillCadence.Monthly,
            new DateOnly(2026, 10, 1),
            3);
        RequestParam(r => r.Shape, "Expense, Income, or Transfer. Decides what a confirmation writes.");
        RequestParam(r => r.Kind, "Fixed when the amount is always the same; Variable when it changes each time.");
        RequestParam(r => r.Amount, "Expected amount. Required for a Fixed entry, optional for a Variable one.");
        RequestParam(r => r.CategoryId, "Expense or income category matching the shape. A Transfer must leave it empty.");
        RequestParam(r => r.AccountId, "The account, or for a Transfer the account the money leaves. Required for a Transfer.");
        RequestParam(r => r.ToAccountId, "The account the money arrives in. Required for a Transfer, rejected otherwise.");
        RequestParam(r => r.Cadence, "Weekly, Monthly, Quarterly, or Yearly.");
        RequestParam(r => r.NextDueDate, "The next date the entry falls due, as YYYY-MM-DD.");
        RequestParam(r => r.RemindDaysBefore, "How many days ahead of the due date to raise a notification.");
        Responses[201] = "The recurring entry was created. The Location header points at it.";
        Responses[400] = "Validation failed, the shape is missing a field it needs, or the account or category is not visible to you.";
    }
}
