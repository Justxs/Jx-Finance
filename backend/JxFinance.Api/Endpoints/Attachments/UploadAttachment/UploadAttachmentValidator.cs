using FastEndpoints;
using JxFinance.Common.Validation;

namespace JxFinance.Endpoints.Attachments.UploadAttachment;

public sealed class UploadAttachmentValidator : Validator<UploadAttachmentRequest>
{
    public UploadAttachmentValidator()
    {
        RuleFor(r => r.File).IsRequired();
    }
}
