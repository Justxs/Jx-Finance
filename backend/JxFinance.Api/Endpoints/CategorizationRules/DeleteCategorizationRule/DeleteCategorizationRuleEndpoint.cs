using FastEndpoints;
using JxFinance.Common;
using JxFinance.Domain.Common;
using JxFinance.Endpoints.CategorizationRules.Interfaces;

namespace JxFinance.Endpoints.CategorizationRules.DeleteCategorizationRule;

public sealed class DeleteCategorizationRuleEndpoint(ICategorizationRuleService ruleService) : DeleteEndpoint
{
    public override void Configure()
    {
        Delete(ApiRoutes.CategorizationRules + "/{id}");
        Group<CategorizationRulesGroup>();
        Description(d => d.ProducesProblemDetails(404));
    }

    protected override Task<Result<Guid>> DeleteAsync(Guid id, CancellationToken ct) =>
        ruleService.DeleteAsync(id, ct);
}
