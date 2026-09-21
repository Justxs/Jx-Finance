using FastEndpoints;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Audit;
using JxFinance.Endpoints.Households.Shared;

namespace JxFinance.Endpoints.Households.GetHouseholdAudit;

public sealed class GetHouseholdAuditSummary : Summary<GetHouseholdAuditEndpoint, GetHouseholdAuditRequest>
{
    public GetHouseholdAuditSummary()
    {
        Summary = "List what members changed in a household";
        Description = "Returns a page of the household's activity, newest first: who created, changed, "
            + "deleted or restored a record shared into the household, who shared or unshared an account, "
            + "category or tag, and who added, removed or re-roled a member or renamed the household. Each "
            + "row carries the words the record was known by at the time and, for an edit, the fields that "
            + "changed with their old and new values as they read then. An import or a bulk edit is one row "
            + "that counts what it touched. Personal records are never listed. Only members of the household "
            + "can read it; while another household is active in the X-Active-Household header, this one is "
            + $"reported as missing. Rows older than {AuditEvent.RetentionDays} days are pruned.";
        Params["id"] = HouseholdSummaryText.Id;
        this.DescribePaging();
        this.Describe(nameof(GetHouseholdAuditRequest.MemberId), "Only rows by this member.");
        this.Describe(nameof(GetHouseholdAuditRequest.Kind), "Only rows about this kind of record.");
        this.Describe(
            nameof(GetHouseholdAuditRequest.DateFrom),
            "Only rows from the start of this day, in the installation's time zone.");
        this.Describe(
            nameof(GetHouseholdAuditRequest.DateTo),
            "Only rows up to the end of this day, in the installation's time zone.");
        Responses[200] = "A page of activity rows with the total row count.";
        Responses[400] = SummaryText.ValidationFailed;
        Responses[404] = HouseholdSummaryText.NotFound;
    }
}
