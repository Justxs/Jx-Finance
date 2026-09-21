using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Attachments;
using JxFinance.Common.Errors;
using JxFinance.Common.Trash;
using JxFinance.Domain.Common;
using JxFinance.Domain.Transactions;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Attachments.Interfaces;
using JxFinance.Endpoints.Attachments.Shared;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Attachments.Services;

[RegisterService<IAttachmentService>(LifeTime.Scoped)]
public sealed class AttachmentService(
    AppDbContext db,
    AttachmentStore files,
    IDeletionRecorder deletions,
    ILogger<AttachmentService> logger) : IAttachmentService
{
    private static readonly DomainError TransactionMissing = new(ErrorCodes.ResourceNotFound, "Transaction not found.");

    private static readonly DomainError AttachmentMissing = new(ErrorCodes.ResourceNotFound, "Attachment not found.");

    private static readonly DomainError FileMissing =
        new(ErrorCodes.ResourceNotFound, "The file of this attachment is no longer stored.");

    private static readonly DomainError Empty = new(ErrorCodes.AttachmentEmpty, "Choose a file that is not empty.");

    private static readonly DomainError TooLarge = new(
        ErrorCodes.AttachmentTooLarge,
        $"A file can be at most {TransactionAttachment.MaxFileBytes / (1024 * 1024)} MB.");

    private static readonly DomainError TypeNotAllowed = new(
        ErrorCodes.AttachmentTypeNotAllowed,
        "Only JPEG, PNG, WebP and HEIC images and PDF documents can be attached.");

    private static readonly DomainError ContentMismatch = new(
        ErrorCodes.AttachmentContentMismatch,
        "The file's content does not match its type. Save it again from the program that made it and retry.");

    private static readonly DomainError LimitReached = new(
        ErrorCodes.AttachmentLimitReached,
        $"A transaction can have at most {TransactionAttachment.MaxPerTransaction} files.");

    public async Task<Result<IReadOnlyList<AttachmentResponse>>> GetAllAsync(
        Guid transactionId,
        CancellationToken cancellationToken)
    {
        var typedId = new TransactionId(transactionId);
        if (!await db.Transactions.AnyAsync(t => t.Id == typedId, cancellationToken))
        {
            return TransactionMissing;
        }

        var attachments = await db.TransactionAttachments
            .Where(a => a.TransactionId == typedId)
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<AttachmentResponse>>.Success(await ToResponsesAsync(attachments, cancellationToken));
    }

    public async Task<Result<AttachmentResponse>> UploadAsync(
        Guid transactionId,
        AttachmentUpload upload,
        CancellationToken cancellationToken)
    {
        var typedId = new TransactionId(transactionId);
        if (!await db.Transactions.AnyAsync(t => t.Id == typedId, cancellationToken))
        {
            return TransactionMissing;
        }

        var declared = AttachmentContent.Canonical(upload.ContentType);
        if (declared is null && !AttachmentContent.IsUnspecified(upload.ContentType))
        {
            return TypeNotAllowed;
        }

        if (upload.Length <= 0)
        {
            return Empty;
        }

        if (upload.Length > TransactionAttachment.MaxFileBytes)
        {
            return TooLarge;
        }

        if (await db.TransactionAttachments.CountAsync(a => a.TransactionId == typedId, cancellationToken)
            >= TransactionAttachment.MaxPerTransaction)
        {
            return LimitReached;
        }

        StoredAttachment stored;
        try
        {
            stored = await files.WriteTemporaryAsync(upload.Content, TransactionAttachment.MaxFileBytes, cancellationToken);
        }
        catch (AttachmentTooLargeException)
        {
            return TooLarge;
        }

        var kept = false;
        try
        {
            if (stored.SizeBytes == 0)
            {
                return Empty;
            }

            var detected = await DetectAsync(stored.Path, cancellationToken);
            if (detected is null)
            {
                return declared is null ? TypeNotAllowed : ContentMismatch;
            }

            if (declared is not null && declared != detected)
            {
                return ContentMismatch;
            }

            var attachment = new TransactionAttachment
            {
                TransactionId = typedId,
                FileName = AttachmentContent.FileName(upload.FileName, detected),
                ContentType = detected,
                SizeBytes = stored.SizeBytes,
                Sha256 = stored.Sha256,
            };

            await using var dbTransaction = await db.Database.BeginTransactionAsync(cancellationToken);
            await db.Database.LockAsync(transactionId, cancellationToken);
            if (await db.TransactionAttachments.CountAsync(a => a.TransactionId == typedId, cancellationToken)
                >= TransactionAttachment.MaxPerTransaction)
            {
                return LimitReached;
            }

            db.TransactionAttachments.Add(attachment);
            files.Keep(stored, attachment.Id.Value);
            kept = true;
            try
            {
                await db.SaveChangesAsync(cancellationToken);
                await dbTransaction.CommitAsync(cancellationToken);
            }
            catch
            {
                files.Delete(attachment.Id.Value);
                throw;
            }

            logger.LogInformation(
                "Attachment {AttachmentId} added to transaction {TransactionId}: {Size} bytes of {ContentType}.",
                attachment.Id,
                transactionId,
                attachment.SizeBytes,
                attachment.ContentType);

            return (await ToResponsesAsync([attachment], cancellationToken))[0];
        }
        finally
        {
            if (!kept)
            {
                files.Discard(stored);
            }
        }
    }

    public async Task<Result<AttachmentDownload>> OpenAsync(Guid id, CancellationToken cancellationToken)
    {
        var typedId = new TransactionAttachmentId(id);
        var attachment = await db.TransactionAttachments.AsNoTracking().FirstOrDefaultAsync(a => a.Id == typedId, cancellationToken);
        if (attachment is null)
        {
            return AttachmentMissing;
        }

        if (!files.Exists(id))
        {
            logger.LogWarning("Attachment {AttachmentId} has no file in the attachment directory.", id);
            return FileMissing;
        }

        return new AttachmentDownload(
            files.OpenRead(id),
            attachment.FileName,
            attachment.ContentType,
            attachment.SizeBytes,
            attachment.Sha256);
    }

    public async Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var typedId = new TransactionAttachmentId(id);
        var attachment = await db.TransactionAttachments.FirstOrDefaultAsync(a => a.Id == typedId, cancellationToken);
        if (attachment is null)
        {
            return AttachmentMissing;
        }

        var transaction = await db.Transactions
            .AsNoTracking()
            .Where(t => t.Id == attachment.TransactionId)
            .Select(t => new { t.Description, t.Date, t.Amount })
            .FirstAsync(cancellationToken);

        deletions.Record(
            TrashKind.Attachment,
            id,
            $"{attachment.FileName}, {TrashLabel.Dated(transaction.Description, transaction.Date, transaction.Amount)}");

        db.TransactionAttachments.Remove(attachment);
        await db.SaveChangesAsync(cancellationToken);

        return id;
    }

    private static async Task<string?> DetectAsync(string path, CancellationToken cancellationToken)
    {
        var header = new byte[AttachmentContent.HeaderBytes];
        await using var stream = File.OpenRead(path);
        var read = await stream.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken);
        return AttachmentContent.Detect(header.AsSpan(0, read));
    }

    private async Task<IReadOnlyList<AttachmentResponse>> ToResponsesAsync(
        IReadOnlyList<TransactionAttachment> attachments,
        CancellationToken cancellationToken)
    {
        var userIds = attachments.Select(a => a.UserId).Distinct().ToList();
        var names = await db.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.DisplayName, u.Email })
            .ToDictionaryAsync(
                u => u.Id,
                u => string.IsNullOrWhiteSpace(u.DisplayName) ? u.Email ?? "" : u.DisplayName,
                cancellationToken);

        return
        [
            .. attachments.Select(a => new AttachmentResponse(
                a.Id.Value,
                a.TransactionId.Value,
                a.FileName,
                a.ContentType,
                a.SizeBytes,
                a.Sha256,
                a.UserId,
                names.GetValueOrDefault(a.UserId) ?? "",
                a.CreatedAt)),
        ];
    }
}
