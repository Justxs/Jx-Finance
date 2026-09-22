using FastEndpoints;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
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
        bill.Shape = input.Shape;
        bill.Kind = input.Kind;
        bill.Amount = input.Amount;
        bill.CategoryId = input.CategoryId is { } categoryId ? new CategoryId(categoryId) : null;
        bill.AccountId = input.AccountId is { } accountId ? new AccountId(accountId) : null;
        bill.ToAccountId = input.ToAccountId is { } toAccountId ? new AccountId(toAccountId) : null;
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
        bill.Shape,
        bill.Kind,
        bill.Amount,
        bill.CategoryId?.Value,
        bill.AccountId?.Value,
        bill.ToAccountId?.Value,
        bill.Cadence,
        bill.NextDueDate,
        bill.RemindDaysBefore,
        bill.IsActive);
}
