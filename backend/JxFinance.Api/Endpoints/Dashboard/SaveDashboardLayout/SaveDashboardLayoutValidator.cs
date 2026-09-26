using System.Linq.Expressions;
using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Dashboard;

namespace JxFinance.Endpoints.Dashboard.SaveDashboardLayout;

public sealed class SaveDashboardLayoutValidator : Validator<SaveDashboardLayoutRequest>
{
    public SaveDashboardLayoutValidator()
    {
        CardList(r => r.Order);
        CardList(r => r.Hidden);
    }

    private void CardList(Expression<Func<SaveDashboardLayoutRequest, IEnumerable<string>>> cards)
    {
        RuleFor(cards).IsPresent();
        RuleForEach(cards)
            .Must(id => DashboardLayout.TryParse(id, out _))
            .WithErrorCode(ErrorCodes.DashboardCardUnknown)
            .WithMessage("'{PropertyValue}' is not a dashboard card.");
        RuleFor(cards)
            .Must(ids => ids is null || ids.Distinct(StringComparer.Ordinal).Count() == ids.Count())
            .WithErrorCode(ErrorCodes.DashboardCardDuplicate)
            .WithMessage("A dashboard card may appear only once.");
    }
}
