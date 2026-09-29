using JxFinance.Common.Errors;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;

namespace JxFinance.Common.Attachments;

public static class AttachmentErrors
{
    public static readonly DomainError Empty = new(ErrorCodes.AttachmentEmpty, "Choose a file that is not empty.");

    public static readonly DomainError TooLarge = new(
        ErrorCodes.AttachmentTooLarge,
        $"A file can be at most {TransactionAttachment.MaxFileBytes / (1024 * 1024)} MB.");

    public static readonly DomainError TypeNotAllowed = new(
        ErrorCodes.AttachmentTypeNotAllowed,
        "Only JPEG, PNG, WebP and HEIC images and PDF documents can be attached.");

    public static readonly DomainError ContentMismatch = new(
        ErrorCodes.AttachmentContentMismatch,
        "The file's content does not match its type. Save it again from the program that made it and retry.");

    public static Result<string> ContentTypeOf(string? declaredType, ReadOnlySpan<byte> header)
    {
        var declared = AttachmentContent.Canonical(declaredType);
        if (declared is null && !AttachmentContent.IsUnspecified(declaredType))
        {
            return TypeNotAllowed;
        }

        var detected = AttachmentContent.Detect(header);
        if (detected is null)
        {
            return declared is null ? TypeNotAllowed : ContentMismatch;
        }

        if (declared is not null && declared != detected)
        {
            return ContentMismatch;
        }

        return detected;
    }
}
