using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Accounts;
using JxFinance.Domain.Categories;
using JxFinance.Domain.RecurringBills;
using JxFinance.Endpoints.RecurringBills.CreateRecurringBill;
using JxFinance.Endpoints.RecurringBills.Shared;
using JxFinance.Endpoints.RecurringBills.UpdateRecurringBill;

namespace JxFinance.Endpoints.RecurringBills.Mappers;

public sealed class RecurringBillMapper : Mapper<CreateRecurringBillRequest, RecurringBillResponse, RecurringBill>
{
    public override RecurringBill ToEntity(CreateRecurringBillRequest request) => new()
    {
        Name = request.Name.Trim(),
        Kind = request.Kind,
        Amount = request.Amount is null ? null : MoneyWire.Parse(request.Amount),
        CategoryId = request.CategoryId is { } categoryId ? new CategoryId(categoryId) : null,
        AccountId = request.AccountId is { } accountId ? new AccountId(accountId) : null,
        Cadence = request.Cadence,
        NextDueDate = request.NextDueDate,
        AnchorDay = request.NextDueDate.Day,
        RemindDaysBefore = request.RemindDaysBefore,
    };

    public void UpdateEntity(UpdateRecurringBillRequest request, RecurringBill bill)
    {
        bill.Name = request.Name.Trim();
        bill.Kind = request.Kind;
        bill.Amount = request.Amount is null ? null : MoneyWire.Parse(request.Amount);
        bill.CategoryId = request.CategoryId is { } categoryId ? new CategoryId(categoryId) : null;
        bill.AccountId = request.AccountId is { } accountId ? new AccountId(accountId) : null;
        bill.Cadence = request.Cadence;
        if (bill.NextDueDate != request.NextDueDate)
        {
            bill.Schedule(request.NextDueDate);
        }

        bill.RemindDaysBefore = request.RemindDaysBefore;
        bill.IsActive = request.IsActive;
    }

    public override RecurringBillResponse FromEntity(RecurringBill bill) => new(
        bill.Id.Value,
        bill.Name,
        bill.Kind,
        bill.Amount is null ? null : MoneyWire.ToWire(bill.Amount.Value),
        bill.CategoryId?.Value,
        bill.AccountId?.Value,
        bill.Cadence,
        bill.NextDueDate,
        bill.RemindDaysBefore,
        bill.IsActive);
}
