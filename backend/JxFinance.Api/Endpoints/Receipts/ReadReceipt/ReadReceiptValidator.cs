using FastEndpoints;
using FluentValidation;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Receipts.ReadReceipt;

public sealed class ReadReceiptValidator : Validator<ReadReceiptRequest>
{
    public ReadReceiptValidator()
    {
        RuleFor(r => r.AttachmentId).IsPresent().When(r => r.File is null);
        RuleFor(r => r.File).IsAbsent().When(r => r.AttachmentId is not null);
    }
}
