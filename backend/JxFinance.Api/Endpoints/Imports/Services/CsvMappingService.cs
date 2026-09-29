using FastEndpoints;
using JxFinance.Common;
using JxFinance.Common.Trash;
using JxFinance.Domain.Common;
using JxFinance.Domain.Imports;
using JxFinance.Domain.Trash;
using JxFinance.Endpoints.Imports.CreateCsvMapping;
using JxFinance.Endpoints.Imports.Interfaces;
using JxFinance.Endpoints.Imports.Mappers;
using JxFinance.Endpoints.Imports.Shared;
using JxFinance.Endpoints.Imports.UpdateCsvMapping;
using JxFinance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace JxFinance.Endpoints.Imports.Services;

[RegisterService<ICsvMappingService>(LifeTime.Scoped)]
public sealed class CsvMappingService(AppDbContext db, IDeletionRecorder deletions) : ICsvMappingService
{
    private static readonly DomainError NotFound = EntityLookup.NotFound("CSV mapping not found.");

    public async Task<IReadOnlyList<CsvMappingResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        var mappings = await db.CsvImportMappings
            .AsNoTracking()
            .OrderBy(m => m.Name)
            .ThenBy(m => m.CreatedAt)
            .ToListAsync(cancellationToken);
        return mappings.Select(m => m.ToResponse()).ToList();
    }

    public async Task<Result<CsvMappingResponse>> CreateAsync(
        CreateCsvMappingRequest request,
        CancellationToken cancellationToken)
    {
        var mapping = request.ToEntity();
        db.CsvImportMappings.Add(mapping);
        await db.SaveChangesAsync(cancellationToken);
        return mapping.ToResponse();
    }

    public async Task<Result<CsvMappingResponse>> UpdateAsync(
        UpdateCsvMappingRequest request,
        CancellationToken cancellationToken)
    {
        var mappingId = new CsvImportMappingId(request.Id);
        var updated = await db.UpdateOrNotFoundAsync<CsvImportMapping>(
            m => m.Id == mappingId,
            NotFound,
            request.ApplyTo,
            cancellationToken);
        return updated.Map(m => m.ToResponse());
    }

    public Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var mappingId = new CsvImportMappingId(id);
        return db.DeleteOrNotFoundAsync<CsvImportMapping>(
            id,
            m => m.Id == mappingId,
            NotFound,
            mapping => deletions.Record(TrashKind.CsvImportMapping, id, mapping.Name),
            cancellationToken);
    }
}
