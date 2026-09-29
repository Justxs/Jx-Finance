using System.Security.Cryptography;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Attachments;
using JxFinance.Common.Errors;
using JxFinance.Common.Receipts;
using JxFinance.Common.References;
using JxFinance.Common.Settings;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Attachments.Shared;
using JxFinance.Endpoints.Imports.Matching;
using JxFinance.Endpoints.Receipts.Interfaces;
using JxFinance.Endpoints.Receipts.Mappers;
using JxFinance.Endpoints.Receipts.Shared;
using JxFinance.Endpoints.Receipts.UpdateReceiptCategories;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Data;
using JxFinance.Infrastructure.Receipts;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Receipts.Services;

[RegisterService<IReceiptService>(LifeTime.Scoped)]
public sealed class ReceiptService(
    AppDbContext db,
    AttachmentStore files,
    IReceiptReader reader,
    IInstanceSettingsStore store,
    IDataProtectionProvider protection,
    IReferenceGuard references,
    IClock clock) : IReceiptService
{
    private const int MaxCandidates = 3;

    private static readonly DomainError ReadingMissing = EntityLookup.NotFound("Receipt reading not found.");

    private static readonly DomainError FileGone = new(
        ErrorCodes.ReceiptUnsupportedFile,
        "The file of this attachment is no longer stored, so it cannot be read.");

    private static readonly DomainError NotConfigured = new(
        ErrorCodes.ReceiptNotConfigured,
        "Receipt reading is not set up. An administrator can switch it on in Settings.");

    private static readonly DomainError Busy = new(
        ErrorCodes.ConflictBusy,
        "This receipt is being read already. Wait for that read to finish.");

    private static readonly DomainError ItemMissing = new(ErrorCodes.RangeInvalid, "The reading has no item with that number.");

    public async Task<Result<ReceiptReadingResponse>> ReadAsync(ReceiptSource source, CancellationToken cancellationToken)
    {
        var loaded = source.AttachmentId is { } attachmentId
            ? await LoadAttachmentAsync(attachmentId, cancellationToken)
            : await LoadUploadAsync(source.Upload!, cancellationToken);
        if (!loaded.TryGetValue(out var file))
        {
            return loaded.Error;
        }

        if (!source.Force && await StoredReadingAsync(file.Sha256, cancellationToken) is { } stored)
        {
            return await ToResponseAsync(stored, cached: true, source, cancellationToken);
        }

        var settings = store.Current;
        if (!settings.ReceiptReadingReady)
        {
            return NotConfigured;
        }

        var apiKey = ReceiptApiKey.Unprotect(protection, settings.Receipts);
        if (!apiKey.TryGetValue(out var key))
        {
            return apiKey.Error;
        }

        var model = settings.Receipts.Model;
        var prepared = ReceiptImage.Prepare(file.Content, file.ContentType, ReceiptModels.LongEdge(model));
        if (!prepared.TryGetValue(out var input))
        {
            return prepared.Error;
        }

        var started = await StartAsync(file.Sha256, model, settings.Receipts.MonthlyLimit, cancellationToken);
        if (!started.TryGetValue(out var reading))
        {
            return started.Error;
        }

        var categories = await db.Categories
            .AsNoTracking()
            .Where(c => c.Type == FlowType.Expense)
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name })
            .ToListAsync(cancellationToken);

        Result<ReceiptExtraction> extraction;
        try
        {
            extraction = await reader.ReadAsync(
                new ReceiptRequest(input, key, model, [.. categories.Select(c => c.Name)]),
                cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            await FinishAsync(reading, null, null, CancellationToken.None);
            throw;
        }

        if (!extraction.TryGetValue(out var read))
        {
            await FinishAsync(reading, null, extraction.ErrorCode, cancellationToken);
            return extraction.Error;
        }

        var items = read.Result.Items
            .Select((item, index) => item with { CategoryId = read.ItemCategories[index] is { } number ? categories[number - 1].Id.Value : null })
            .ToList();
        reading.InputTokens = read.InputTokens;
        reading.OutputTokens = read.OutputTokens;
        await FinishAsync(reading, read.Result with { Items = await RememberedAsync(items, cancellationToken) }, null, cancellationToken);

        var month = ReceiptReadingUsage.MonthOf(clock.Today);
        await db.ReceiptReadingUsages
            .Where(u => u.Month == month)
            .ExecuteUpdateAsync(
                s => s
                    .SetProperty(u => u.InputTokens, u => u.InputTokens + read.InputTokens)
                    .SetProperty(u => u.OutputTokens, u => u.OutputTokens + read.OutputTokens),
                cancellationToken);
        await db.ReceiptReadings
            .Where(r => r.Sha256 == file.Sha256 && r.Status == ReceiptReadingStatus.Read && r.Id != reading.Id)
            .ExecuteDeleteAsync(cancellationToken);

        return await ToResponseAsync(reading, cached: false, source, cancellationToken);
    }

    public async Task<Result> UpdateCategoriesAsync(
        Guid id,
        IReadOnlyList<ReceiptItemChoice> items,
        CancellationToken cancellationToken)
    {
        var typedId = new ReceiptReadingId(id);
        var reading = await db.ReceiptReadings
            .FirstOrDefaultAsync(r => r.Id == typedId && r.Status == ReceiptReadingStatus.Read, cancellationToken);
        if (reading?.Result is not { } result)
        {
            return ReadingMissing;
        }

        if (items.Any(item => item.Index >= result.Items.Count))
        {
            return ItemMissing;
        }

        foreach (var categoryId in items.Select(item => item.CategoryId).OfType<Guid>().Distinct())
        {
            if (await references.CategoryOfTypeAsync(
                new CategoryId(categoryId),
                FlowType.Expense,
                "A receipt item can only be filed under an expense category.",
                cancellationToken) is { } error)
            {
                return error;
            }
        }

        var choices = items.GroupBy(item => item.Index).ToDictionary(group => group.Key, group => group.Last().CategoryId);
        reading.Result = result with
        {
            Items =
            [
                .. result.Items.Select((item, index) => choices.TryGetValue(index, out var categoryId)
                    ? item with { CategoryId = categoryId, Remembered = item.Remembered && item.CategoryId == categoryId }
                    : item),
            ],
        };

        var mappings = choices
            .Select(choice => (Key: ReceiptItemKey.Normalize(result.Items[choice.Key].Name), CategoryId: choice.Value))
            .Where(choice => choice.Key.Length > 0)
            .GroupBy(choice => choice.Key)
            .ToDictionary(group => group.Key, group => group.Last().CategoryId);
        var keys = mappings.Keys.ToList();

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(reading.UserId, cancellationToken);
        var existing = await db.ReceiptItemCategories
            .Where(m => keys.Contains(m.Key))
            .ToDictionaryAsync(m => m.Key, cancellationToken);
        foreach (var (itemKey, categoryId) in mappings)
        {
            if (categoryId is not { } chosen)
            {
                continue;
            }

            if (existing.TryGetValue(itemKey, out var mapping))
            {
                mapping.CategoryId = new CategoryId(chosen);
                mapping.UpdatedAt = clock.UtcNow;
            }
            else
            {
                db.ReceiptItemCategories.Add(new ReceiptItemCategory { Key = itemKey, CategoryId = new CategoryId(chosen) });
            }
        }

        await db.SaveChangesAsync(cancellationToken);
        var forgotten = mappings.Where(m => m.Value is null).Select(m => m.Key).ToList();
        await db.ReceiptItemCategories.Where(m => forgotten.Contains(m.Key)).ExecuteDeleteAsync(cancellationToken);
        var excess = await db.ReceiptItemCategories.CountAsync(cancellationToken) - ReceiptItemCategory.MaxPerUser;
        if (excess > 0)
        {
            await db.ReceiptItemCategories.OrderBy(m => m.UpdatedAt).Take(excess).ExecuteDeleteAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return Result.Success();
    }

    private async Task<Result<ReceiptFile>> LoadAttachmentAsync(Guid attachmentId, CancellationToken cancellationToken)
    {
        var typedId = new TransactionAttachmentId(attachmentId);
        var attachment = await db.TransactionAttachments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == typedId, cancellationToken);
        if (attachment is null)
        {
            return EntityLookup.NotFound("Attachment not found.");
        }

        if (!files.Exists(attachmentId))
        {
            return FileGone;
        }

        await using var stream = files.OpenRead(attachmentId);
        using var content = new MemoryStream();
        await stream.CopyToAsync(content, cancellationToken);
        return new ReceiptFile(content.ToArray(), attachment.ContentType, attachment.Sha256);
    }

    private static async Task<Result<ReceiptFile>> LoadUploadAsync(AttachmentUpload upload, CancellationToken cancellationToken)
    {
        if (upload.Length <= 0)
        {
            return AttachmentErrors.Empty;
        }

        if (upload.Length > TransactionAttachment.MaxFileBytes)
        {
            return AttachmentErrors.TooLarge;
        }

        using var content = new MemoryStream();
        await upload.Content.CopyToAsync(content, cancellationToken);
        if (content.Length == 0)
        {
            return AttachmentErrors.Empty;
        }

        if (content.Length > TransactionAttachment.MaxFileBytes)
        {
            return AttachmentErrors.TooLarge;
        }

        var bytes = content.ToArray();
        var contentType = AttachmentErrors.ContentTypeOf(
            upload.ContentType,
            bytes.AsSpan(0, Math.Min(bytes.Length, AttachmentContent.HeaderBytes)));
        if (!contentType.TryGetValue(out var detected))
        {
            return contentType.Error;
        }

        return new ReceiptFile(bytes, detected, Convert.ToHexStringLower(SHA256.HashData(bytes)));
    }

    private Task<ReceiptReading?> StoredReadingAsync(string sha256, CancellationToken cancellationToken) =>
        db.ReceiptReadings
            .AsNoTracking()
            .Where(r => r.Sha256 == sha256 && r.Status == ReceiptReadingStatus.Read)
            .OrderByDescending(r => r.CompletedAt)
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<Result<ReceiptReading>> StartAsync(
        string sha256,
        string model,
        int monthlyLimit,
        CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.Database.LockAsync(AppLock.ReceiptReadings, cancellationToken);

        var busySince = clock.UtcNow - ReceiptReading.PendingTimeout;
        if (await db.ReceiptReadings.AnyAsync(
            r => r.Sha256 == sha256 && r.Status == ReceiptReadingStatus.Pending && r.CreatedAt > busySince,
            cancellationToken))
        {
            return Busy;
        }

        var month = ReceiptReadingUsage.MonthOf(clock.Today);
        var usage = await db.ReceiptReadingUsages.FirstOrDefaultAsync(u => u.Month == month, cancellationToken);
        if (usage is null)
        {
            usage = new ReceiptReadingUsage { Month = month };
            db.ReceiptReadingUsages.Add(usage);
        }

        if (usage.Readings >= monthlyLimit)
        {
            return new DomainError(
                ErrorCodes.ReceiptLimitReached,
                $"This installation has used its {monthlyLimit} receipt reads for this month. An administrator can raise the limit.");
        }

        usage.Readings++;
        var reading = new ReceiptReading { Sha256 = sha256, Model = model, Status = ReceiptReadingStatus.Pending };
        db.ReceiptReadings.Add(reading);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return reading;
    }

    private async Task FinishAsync(
        ReceiptReading reading,
        ReceiptResult? result,
        string? errorCode,
        CancellationToken cancellationToken)
    {
        reading.Status = result is null ? ReceiptReadingStatus.Failed : ReceiptReadingStatus.Read;
        reading.Result = result;
        reading.ErrorCode = errorCode;
        reading.CompletedAt = clock.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task<List<ReceiptItem>> RememberedAsync(List<ReceiptItem> items, CancellationToken cancellationToken)
    {
        var keys = items.Select(item => ReceiptItemKey.Normalize(item.Name)).Where(key => key.Length > 0).Distinct().ToList();
        var remembered = await db.ReceiptItemCategories
            .AsNoTracking()
            .Where(m => keys.Contains(m.Key)
                && db.Categories.Any(c => c.Id == m.CategoryId && c.Type == FlowType.Expense))
            .ToDictionaryAsync(m => m.Key, m => m.CategoryId.Value, cancellationToken);

        return
        [
            .. items.Select(item => remembered.TryGetValue(ReceiptItemKey.Normalize(item.Name), out var categoryId)
                ? item with { CategoryId = categoryId, Remembered = true }
                : item),
        ];
    }

    private async Task<ReceiptReadingResponse> ToResponseAsync(
        ReceiptReading reading,
        bool cached,
        ReceiptSource source,
        CancellationToken cancellationToken)
    {
        var result = reading.Result!;
        IReadOnlyList<ReceiptCandidateResponse> candidates = source.AttachmentId is null
            && result is { Total: > 0 and var total, Date: { } date }
            ? await CandidatesAsync(total, result.Currency, date, cancellationToken)
            : [];
        return new ReceiptReadingResponse(reading.Id.Value, reading.Model, cached, result.ToResponse(), candidates);
    }

    private async Task<IReadOnlyList<ReceiptCandidateResponse>> CandidatesAsync(
        decimal total,
        Currency? currency,
        DateOnly date,
        CancellationToken cancellationToken)
    {
        var from = date.AddDays(-ManualEntryMatcher.MaxDays);
        var to = date.AddDays(ManualEntryMatcher.MaxDays);
        var matches = await db.Transactions
            .AsNoTracking()
            .Where(t => t.Type == FlowType.Expense
                && !t.IsSplit
                && t.Amount.Amount == total
                && (currency == null || t.Amount.Currency == currency)
                && t.Date >= from
                && t.Date <= to)
            .ToListAsync(cancellationToken);

        return
        [
            .. matches
                .OrderBy(t => Math.Abs(t.Date.DayNumber - date.DayNumber))
                .ThenBy(t => t.Date)
                .Take(MaxCandidates)
                .Select(t => t.ToCandidate()),
        ];
    }

    private sealed record ReceiptFile(byte[] Content, string ContentType, string Sha256);
}
