using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Receipts.GetReceiptItems;

public sealed class GetReceiptItemsValidator : Validator<GetReceiptItemsRequest>
{
    public GetReceiptItemsValidator()
    {
        RuleFor(r => r.DateFrom).IsRequired();
        RuleFor(r => r.DateTo).IsRequired().IsNotBefore(r => r.DateFrom);
        RuleFor(r => r.Search).HasMaxLength(100);
    }
}
