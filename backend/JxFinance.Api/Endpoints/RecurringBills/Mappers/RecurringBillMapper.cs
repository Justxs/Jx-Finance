using FastEndpoints;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.RecurringBills.CreateRecurringBill;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

namespace JxFinance.Endpoints.RecurringBills.Mappers;

public sealed class RecurringBillMapper : Mapper<CreateRecurringBillRequest, RecurringBillResponse, RecurringBill>
{
    public override RecurringBill ToEntity(CreateRecurringBillRequest request)
    {
        var bill = new RecurringBill { Name = request.Name };
        Apply(request, bill);
        return bill;
    }

    public void Apply(UpdateRecurringBillRequest request, RecurringBill bill)
    {
        Apply((IRecurringBillInput)request, bill);
        bill.IsActive = request.IsActive;
    }

    private static void Apply(IRecurringBillInput input, RecurringBill bill)
    {
        bill.Name = input.Name.Trim();
        bill.Kind = input.Kind;
        bill.Amount = input.Amount is { } amount ? new Money(amount) : null;
        bill.CategoryId = input.CategoryId is { } categoryId ? new CategoryId(categoryId) : null;
        bill.AccountId = input.AccountId is { } accountId ? new AccountId(accountId) : null;
        bill.Cadence = input.Cadence;
        if (bill.NextDueDate != input.NextDueDate)
        {
            bill.Schedule(input.NextDueDate);
        }

        bill.RemindDaysBefore = input.RemindDaysBefore;
    }

    public override RecurringBillResponse FromEntity(RecurringBill bill) => new(
        bill.Id.Value,
        bill.Name,
        bill.Kind,
        bill.Amount?.Amount,
        bill.CategoryId?.Value,
        bill.AccountId?.Value,
        bill.Cadence,
        bill.NextDueDate,
        bill.RemindDaysBefore,
        bill.IsActive);
}
