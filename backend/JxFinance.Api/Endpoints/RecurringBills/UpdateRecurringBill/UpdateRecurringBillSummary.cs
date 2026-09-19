using FastEndpoints;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

public sealed class UpdateRecurringBillSummary : Summary<UpdateRecurringBillEndpoint, UpdateRecurringBillRequest>
{
    public UpdateRecurringBillSummary()
    {
        Summary = "Update a recurring bill";
        Description = "Changes the schedule, the expected amount, or the reminder lead time. Setting "
            + "isActive to false stops reminders without losing the schedule or the transactions already "
            + "posted from it.";
        ExampleRequest = new UpdateRecurringBillRequest(
            Guid.Empty,
            "Rent",
            RecurringBillKind.Fixed,
            675.00m,
            null,
            null,
            RecurringBillCadence.Monthly,
            new DateOnly(2026, 11, 1),
            3,
            true);
        Params["id"] = "The recurring bill id. Takes precedence over the id in the body.";
        Responses[200] = "The updated recurring bill.";
        Responses[400] = "Validation failed, or the account or category is not visible to you.";
        Responses[404] = "No such recurring bill belongs to the signed-in user.";
    }
}
