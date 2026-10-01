using FastEndpoints;
using JxFinance.Domain.Investments;

namespace JxFinance.Endpoints.Investments.SaveAllocationTargets;

public sealed class SaveAllocationTargetsSummary : Summary<SaveAllocationTargetsEndpoint, SaveAllocationTargetsRequest>
{
    public SaveAllocationTargetsSummary()
    {
        Summary = "Replace your target allocation";
        Description = "Replaces every target you had with the ones sent, all in one dimension, so targets of another "
            + "dimension are dropped; an empty list removes your targets. Shares are percentages with at most two "
            + "decimals and add up to exactly 100. A bucket you hold without a target counts as a target of 0.";
        ExampleRequest = new SaveAllocationTargetsRequest(
            AllocationDimension.Type,
            [new AllocationTargetInput("etf", 70m), new AllocationTargetInput("bond", 20m), new AllocationTargetInput("stock", 10m)]);
        RequestParam(r => r.Dimension, "type, currency or security.");
        RequestParam(
            r => r.Targets,
            "Each bucket at most once: a security type such as etf, a currency such as eur, or a security id; at most 100.");
        Responses[200] = "The targets as stored, largest share first.";
        Responses[400] = "Validation failed: allocation.shareInvalid, allocation.sharesTotal, allocation.bucketUnknown "
            + "(also for a security id that does not exist) or allocation.bucketDuplicate.";
    }
}
