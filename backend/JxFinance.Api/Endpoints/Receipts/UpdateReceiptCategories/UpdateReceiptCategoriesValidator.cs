using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;
using JxFinance.Domain.Receipts;

namespace JxFinance.Endpoints.Receipts.UpdateReceiptCategories;

public sealed class UpdateReceiptCategoriesValidator : Validator<UpdateReceiptCategoriesRequest>
{
    public UpdateReceiptCategoriesValidator()
    {
        RuleFor(r => r.Items).IsPresent();
        RuleForEach(r => r.Items)
            .ChildRules(item => item.RuleFor(i => i.Index).IsWithin(0, ReceiptResult.MaxItems - 1))
            .When(r => r.Items is not null);
    }
}
