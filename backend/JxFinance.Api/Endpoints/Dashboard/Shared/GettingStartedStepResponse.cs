using JxFinance.Domain.Dashboard;

namespace JxFinance.Endpoints.Dashboard.Shared;

public sealed record GettingStartedStepResponse(GettingStartedStep Step, bool Done);
