using System.Security.Cryptography;
using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Attachments;
using JxFinance.Common.Errors;
using JxFinance.Common.Receipts;
using JxFinance.Common.References;
using JxFinance.Common.Refunds;
using JxFinance.Common.Settings;
using JxFinance.Common.Subscriptions;
using JxFinance.Domain.Categories;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Domain.Settings;
using JxFinance.Domain.Transactions;
using JxFinance.Endpoints.Attachments.Shared;
using JxFinance.Endpoints.CategorizationRules.Interfaces;
using JxFinance.Endpoints.CategorizationRules.Shared;
using JxFinance.Endpoints.Imports.Matching;
using JxFinance.Endpoints.Receipts.Interfaces;
using JxFinance.Endpoints.Receipts.Mappers;
using JxFinance.Endpoints.Receipts.Shared;
using JxFinance.Endpoints.Receipts.UpdateReceiptCategories;
using JxFinance.Endpoints.Transactions.Shared;
using JxFinance.Infrastructure.Attachments;
using JxFinance.Infrastructure.Data;
using JxFinance.Infrastructure.Receipts;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Receipts.Services;

[RegisterService<IReceiptService>(LifeTime.Scoped)]
public sealed class ReceiptService(
    AppDbContext db,
    AttachmentStore files,
    IReceiptReader reader,
    ICategorizationRuleService rules,
    IInstanceSettingsStore store,
    IReferenceGuard references,
    IClock clock) : IReceiptService
{
    private const int MaxCandidates = 3;

    private static readonly DomainError ReadingMissing = EntityLookup.NotFound("Receipt reading not found.");

    private static readonly DomainError FileGone = new(
        ErrorCodes.ReceiptUnsupportedFile,
        "The file of this attachment is no longer stored, so it cannot be read.");

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
            return await ToResponseAsync(stored, cached: true, source, file.Position, cancellationToken);
        }

        var prepared = ReceiptImage.Prepare(file.Content, file.ContentType);
        if (!prepared.TryGetValue(out var input))
        {
            return prepared.Error;
        }

        if (input.Text is null && !reader.IsAvailable)
        {
            return ReceiptErrors.EngineUnavailable;
        }

        var started = await StartAsync(file.Sha256, cancellationToken);
        if (!started.TryGetValue(out var reading))
        {
            return started.Error;
        }

        try
        {
            var parsed = await ParseAsync(input, cancellationToken);
            if (!parsed.TryGetValue(out var result))
            {
                await FinishAsync(reading, null, parsed.ErrorCode, cancellationToken);
                return parsed.Error;
            }

            var items = await CategorizedAsync(result.Items, cancellationToken);
            await FinishAsync(reading, result with { Items = items }, null, cancellationToken);
        }
        catch (Exception)
        {
            await FinishAsync(reading, null, null, CancellationToken.None);
            throw;
        }

        await db.ReceiptReadings
            .Where(r => r.Sha256 == file.Sha256 && r.Status == ReceiptReadingStatus.Read && r.Id != reading.Id)
            .ExecuteDeleteAsync(cancellationToken);

        return await ToResponseAsync(reading, cached: false, source, file.Position, cancellationToken);
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
        if (!store.Current.IsEnabled(Feature.Attachments))
        {
            return new DomainError(ErrorCodes.FeatureDisabled, $"The {Feature.Attachments} feature is turned off for this installation.");
        }

        var typedId = new TransactionAttachmentId(attachmentId);
        var attachment = await db.TransactionAttachments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == typedId, cancellationToken);
        if (attachment is null)
        {
            return EntityLookup.NotFound("Attachment not found.");
        }

        await using var stream = files.TryOpenRead(attachmentId);
        if (stream is null)
        {
            return FileGone;
        }

        using var content = new MemoryStream();
        await stream.CopyToAsync(content, cancellationToken);
        return new ReceiptFile(content.ToArray(), attachment.ContentType, attachment.Sha256);
    }

    private static async Task<Result<ReceiptFile>> LoadUploadAsync(AttachmentUpload upload, CancellationToken cancellationToken)
    {
        using var content = new MemoryStream();
        StoredAttachment copied;
        try
        {
            copied = await AttachmentStore.CopyAsync(upload.Content, content, string.Empty, TransactionAttachment.MaxFileBytes, cancellationToken);
        }
        catch (AttachmentTooLargeException)
        {
            return AttachmentErrors.TooLarge;
        }

        if (copied.SizeBytes == 0)
        {
            return AttachmentErrors.Empty;
        }

        var bytes = content.ToArray();
        var header = bytes.AsSpan(0, Math.Min(bytes.Length, AttachmentContent.HeaderBytes));
        if (ReceiptDocument.ContentTypeOf(upload.ContentType, upload.FileName, header) is { } document)
        {
            return new ReceiptFile(bytes, document, Convert.ToHexStringLower(SHA256.HashData(bytes)));
        }

        var contentType = AttachmentErrors.ContentTypeOf(upload.ContentType, header);
        if (!contentType.TryGetValue(out var detected))
        {
            return contentType.Error;
        }

        var position = PhotoLocation.Read(bytes, detected);
        if (!AttachmentImage.WithoutMetadata(bytes, detected).TryGetValue(out var file))
        {
            return ReceiptErrors.Unsupported;
        }

        return new ReceiptFile(file.Content, file.ContentType, Convert.ToHexStringLower(SHA256.HashData(file.Content)), position);
    }

    private Task<ReceiptReading?> StoredReadingAsync(string sha256, CancellationToken cancellationToken) =>
        db.ReceiptReadings
            .AsNoTracking()
            .Where(r => r.Sha256 == sha256 && r.Status == ReceiptReadingStatus.Read)
            .OrderByDescending(r => r.CompletedAt)
            .FirstOrDefaultAsync(cancellationToken);

    private async Task<Result<ReceiptReading>> StartAsync(string sha256, CancellationToken cancellationToken)
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

        var reading = new ReceiptReading { Sha256 = sha256, Status = ReceiptReadingStatus.Pending };
        db.ReceiptReadings.Add(reading);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return reading;
    }

    private async Task<Result<ReceiptResult>> ParseAsync(ReceiptInput input, CancellationToken cancellationToken)
    {
        var text = input.Text is { } embedded
            ? Result<string>.Success(embedded)
            : await ReadPagesAsync(input.Pages, cancellationToken);
        return text.TryGetValue(out var read)
            ? ReceiptTextParser.Parse(read).Map(result => result with { PagesRead = input.PagesRead, PageCount = input.PageCount })
            : text.Error;
    }

    private async Task<Result<string>> ReadPagesAsync(IReadOnlyList<IReadOnlyList<byte[]>> pages, CancellationToken cancellationToken)
    {
        var pageTexts = new List<string>();
        foreach (var bands in pages)
        {
            var bandTexts = new List<string>();
            foreach (var band in bands)
            {
                var text = await reader.ReadTextAsync(band, cancellationToken);
                if (!text.TryGetValue(out var read))
                {
                    return text.Error;
                }

                bandTexts.Add(read);
            }

            pageTexts.Add(ReceiptBands.Join(bandTexts));
        }

        return string.Join('\n', pageTexts);
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

    private async Task<List<ReceiptItem>> CategorizedAsync(IReadOnlyList<ReceiptItem> items, CancellationToken cancellationToken)
    {
        var keys = items.Select(item => ReceiptItemKey.Normalize(item.Name)).Where(key => key.Length > 0).Distinct().ToList();
        var remembered = await db.ReceiptItemCategories
            .AsNoTracking()
            .Where(m => keys.Contains(m.Key)
                && db.Categories.Any(c => c.Id == m.CategoryId && c.Type == FlowType.Expense))
            .ToDictionaryAsync(m => m.Key, m => m.CategoryId.Value, cancellationToken);
        IReadOnlyList<RuleSuggestion?> suggestions = store.Current.IsEnabled(Feature.CategorizationRules)
            ? await rules.SuggestAsync(null, [.. items.Select(item => new RuleCandidate(item.Name, item.Amount, FlowType.Expense))], cancellationToken)
            : [.. items.Select(_ => (RuleSuggestion?)null)];

        return
        [
            .. items.Select((item, index) => remembered.TryGetValue(ReceiptItemKey.Normalize(item.Name), out var categoryId)
                ? item with { CategoryId = categoryId, Remembered = true }
                : item with { CategoryId = suggestions[index]?.CategoryId }),
        ];
    }

    private async Task<ReceiptReadingResponse> ToResponseAsync(
        ReceiptReading reading,
        bool cached,
        ReceiptSource source,
        PhotoPosition? position,
        CancellationToken cancellationToken)
    {
        var result = reading.Result!;
        var shown = store.Current.IsEnabled(Feature.Locations) ? position : null;
        IReadOnlyList<ReceiptCandidateResponse> candidates = source.AttachmentId is null
            && result is { IsReturn: false, Total: > 0 and var total, Date: { } date }
            ? await CandidatesAsync(total, result.Currency, date, cancellationToken)
            : [];
        var refundOf = result.IsReturn ? await RefundOriginalAsync(result, reading.Sha256, cancellationToken) : null;
        return new ReceiptReadingResponse(
            reading.Id.Value,
            cached,
            result.ToResponse(),
            candidates,
            shown?.Latitude,
            shown?.Longitude,
            refundOf);
    }

    private async Task<TransactionRefundOfResponse?> RefundOriginalAsync(
        ReceiptResult result,
        string sha256,
        CancellationToken cancellationToken)
    {
        var key = SubscriptionDescription.Normalize(result.Merchant);
        if (key.Length == 0)
        {
            return null;
        }

        var prefix = key + " ";
        var date = result.Date ?? clock.Today;
        var from = date.AddDays(-RefundOriginal.CandidateLookBackDays);
        var total = result.Total ?? 0;
        var currency = result.Currency;
        return await db.Transactions
            .AsNoTracking()
            .Where(t => t.Type == FlowType.Expense
                && t.Amount.Amount > 0
                && t.Amount.Amount >= total
                && (currency == null || t.Amount.Currency == currency)
                && t.Date >= from
                && t.Date <= date
                && t.PayeeKey != null
                && (t.PayeeKey == key || t.PayeeKey.StartsWith(prefix))
                && !db.TransactionAttachments.Any(a => a.TransactionId == t.Id && a.Sha256 == sha256))
            .OrderByDescending(t => t.Date)
            .ThenByDescending(t => t.CreatedAt)
            .Select(t => new TransactionRefundOfResponse(t.Id.Value, t.Date, t.Description))
            .FirstOrDefaultAsync(cancellationToken);
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

    private sealed record ReceiptFile(byte[] Content, string ContentType, string Sha256, PhotoPosition? Position = null);
}
