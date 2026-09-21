using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Errors;
using JxFinance.Common.Validation;
using JxFinance.Domain.Dashboard;

namespace JxFinance.Endpoints.Dashboard.SaveDashboardLayout;

public sealed class SaveDashboardLayoutValidator : Validator<SaveDashboardLayoutRequest>
{
    private const string UnknownMessage = "'{PropertyValue}' is not a dashboard card.";
    private const string DuplicateMessage = "A dashboard card may appear only once.";

    public SaveDashboardLayoutValidator()
    {
        RuleFor(r => r.Order).IsPresent();
        RuleFor(r => r.Hidden).IsPresent();
        RuleForEach(r => r.Order).Must(IsKnown).WithErrorCode(ErrorCodes.DashboardCardUnknown).WithMessage(UnknownMessage);
        RuleForEach(r => r.Hidden).Must(IsKnown).WithErrorCode(ErrorCodes.DashboardCardUnknown).WithMessage(UnknownMessage);
        RuleFor(r => r.Order).Must(IsDistinct)
            .WithErrorCode(ErrorCodes.DashboardCardDuplicate)
            .WithMessage(DuplicateMessage)
            .When(r => r.Order is not null);
        RuleFor(r => r.Hidden).Must(IsDistinct)
            .WithErrorCode(ErrorCodes.DashboardCardDuplicate)
            .WithMessage(DuplicateMessage)
            .When(r => r.Hidden is not null);
    }

    private static bool IsKnown(string? id) => DashboardLayout.TryParse(id, out _);

    private static bool IsDistinct(IReadOnlyList<string> ids) =>
        ids.Distinct(StringComparer.Ordinal).Count() == ids.Count;
}
