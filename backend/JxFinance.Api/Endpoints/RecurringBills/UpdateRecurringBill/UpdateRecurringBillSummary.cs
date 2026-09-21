using FastEndpoints;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

public sealed class UpdateRecurringBillSummary : Summary<UpdateRecurringBillEndpoint, UpdateRecurringBillRequest>
{
    public UpdateRecurringBillSummary()
    {
        Summary = "Update a recurring entry";
        Description = "Changes the shape, the schedule, the expected amount, or the reminder lead time. "
            + "A shape change must bring the fields the new shape needs: a Transfer needs both accounts and "
            + "no category, an Expense or an Income needs no destination account. Setting isActive to false "
            + "stops reminders without losing the schedule or the rows already posted from it.";
        ExampleRequest = new UpdateRecurringBillRequest(
            Guid.Empty,
            "Rent",
            RecurringBillShape.Expense,
            RecurringBillKind.Fixed,
            675.00m,
            null,
            null,
            null,
            RecurringBillCadence.Monthly,
            new DateOnly(2026, 11, 1),
            3,
            true);
        Params["id"] = "The recurring entry id. Takes precedence over the id in the body.";
        Responses[200] = "The updated recurring entry.";
        Responses[400] = "Validation failed, the shape is missing a field it needs, or the account or category is not visible to you.";
        Responses[404] = "No such recurring entry belongs to the signed-in user.";
    }
}
