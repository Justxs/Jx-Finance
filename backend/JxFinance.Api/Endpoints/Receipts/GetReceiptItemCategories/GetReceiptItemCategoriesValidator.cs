using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Receipts.GetReceiptItemCategories;

public sealed class GetReceiptItemCategoriesValidator : Validator<GetReceiptItemCategoriesRequest>
{
    public GetReceiptItemCategoriesValidator()
    {
        RuleFor(r => r.Search).HasMaxLength(100);
    }
}
