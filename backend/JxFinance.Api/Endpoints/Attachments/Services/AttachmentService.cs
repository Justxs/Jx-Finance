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
using JxFinance.Infrastructure.Auth;
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
    private static readonly DomainError TransactionMissing = EntityLookup.NotFound("Transaction not found.");

    private static readonly DomainError AttachmentMissing = EntityLookup.NotFound("Attachment not found.");

    private static readonly DomainError FileMissing =
        EntityLookup.NotFound("The file of this attachment is no longer stored.");

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
            .AsNoTracking()
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

        if (AttachmentContent.Canonical(upload.ContentType) is null && !AttachmentContent.IsUnspecified(upload.ContentType))
        {
            return AttachmentErrors.TypeNotAllowed;
        }

        if (upload.Length <= 0)
        {
            return AttachmentErrors.Empty;
        }

        if (upload.Length > TransactionAttachment.MaxFileBytes)
        {
            return AttachmentErrors.TooLarge;
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
            return AttachmentErrors.TooLarge;
        }

        var kept = false;
        try
        {
            if (stored.SizeBytes == 0)
            {
                return AttachmentErrors.Empty;
            }

            var contentType = AttachmentErrors.ContentTypeOf(upload.ContentType, await ReadHeaderAsync(stored.Path, cancellationToken));
            if (!contentType.TryGetValue(out var detected))
            {
                return contentType.Error;
            }

            var fileName = AttachmentContent.FileName(upload.FileName, detected);
            if (AttachmentImage.Formats.ContainsKey(detected))
            {
                var cleaned = AttachmentImage.WithoutMetadata(await files.ReadAsync(stored, cancellationToken), detected);
                if (!cleaned.TryGetValue(out var image))
                {
                    return cleaned.Error;
                }

                if (image.Content.Length > TransactionAttachment.MaxFileBytes)
                {
                    return AttachmentErrors.TooLarge;
                }

                stored = await files.ReplaceAsync(stored, image.Content, cancellationToken);
                if (image.ContentType != detected)
                {
                    fileName = AttachmentContent.FileName(Path.ChangeExtension(fileName, null), image.ContentType);
                    detected = image.ContentType;
                }
            }

            var attachment = new TransactionAttachment
            {
                TransactionId = typedId,
                FileName = fileName,
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

        if (files.TryOpenRead(id) is not { } content)
        {
            logger.LogWarning("Attachment {AttachmentId} has no file in the attachment directory.", id);
            return FileMissing;
        }

        return new AttachmentDownload(
            content,
            attachment.FileName,
            attachment.ContentType,
            attachment.SizeBytes,
            attachment.Sha256);
    }

    public async Task<Result<AttachmentResponse>> SetWarrantyAsync(
        Guid id,
        DateOnly? warrantyUntil,
        CancellationToken cancellationToken)
    {
        var typedId = new TransactionAttachmentId(id);
        if (await db.TransactionAttachments.FirstOrDefaultAsync(a => a.Id == typedId, cancellationToken) is not { } attachment)
        {
            return AttachmentMissing;
        }

        attachment.WarrantyUntil = warrantyUntil;
        await db.SaveChangesAsync(cancellationToken);
        return (await ToResponsesAsync([attachment], cancellationToken))[0];
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var typedId = new TransactionAttachmentId(id);
        return db.DeleteOrNotFoundAsync<TransactionAttachment>(
            id,
            a => a.Id == typedId,
            AttachmentMissing,
            async attachment =>
            {
                var transaction = await db.Transactions
                    .AsNoTracking()
                    .Where(t => t.Id == attachment.TransactionId)
                    .Select(t => new { t.Description, t.Date, t.Amount })
                    .FirstAsync(cancellationToken);

                deletions.Record(
                    TrashKind.Attachment,
                    id,
                    $"{attachment.FileName}, {TrashLabel.Dated(transaction.Description, transaction.Date, transaction.Amount)}");
                return null;
            },
            cancellationToken);
    }

    private static async Task<byte[]> ReadHeaderAsync(string path, CancellationToken cancellationToken)
    {
        var header = new byte[AttachmentContent.HeaderBytes];
        await using var stream = File.OpenRead(path);
        var read = await stream.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken);
        return header[..read];
    }

    private async Task<IReadOnlyList<AttachmentResponse>> ToResponsesAsync(
        IReadOnlyList<TransactionAttachment> attachments,
        CancellationToken cancellationToken)
    {
        var names = await db.Users.DisplayNamesAsync(attachments.Select(a => a.UserId), cancellationToken);

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
                a.CreatedAt,
                a.WarrantyUntil)),
        ];
    }
}
