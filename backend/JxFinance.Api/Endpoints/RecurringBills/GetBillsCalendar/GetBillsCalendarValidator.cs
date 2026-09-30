using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.RecurringBills.GetBillsCalendar;

public sealed class GetBillsCalendarValidator : Validator<GetBillsCalendarRequest>
{
    public GetBillsCalendarValidator()
    {
        RuleFor(r => r.Month).IsMonth();
    }
}
