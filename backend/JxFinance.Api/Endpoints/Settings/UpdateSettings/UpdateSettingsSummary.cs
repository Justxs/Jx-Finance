using FastEndpoints;

namespace JxFinance.Endpoints.Settings.UpdateSettings;

public sealed class UpdateSettingsSummary : Summary<UpdateSettingsEndpoint, UpdateSettingsRequest>
{
    public UpdateSettingsSummary()
    {
        Summary = "Update installation settings";
        Description = "Administrators only. Replaces every installation-wide setting. A feature that is "
            + "turned off answers 404 with code feature.disabled on its routes and its background work "
            + "stops; its data is kept. Changing the reporting currency revalues every stored transaction "
            + "at the exchange rate for its own date and fails without saving anything if a rate is "
            + "missing. Budgets, goals, assets, debts, bills and net worth history keep their numbers.";
        RequestParam(r => r.InstanceName, "Shown beside the logo and in the browser tab. Null uses the product name.");
        RequestParam(r => r.EnabledCurrencies, "Currencies offered when entering data. The reporting currency is always included.");
        RequestParam(r => r.TimeZone, "IANA time zone id that decides what today and this month mean.");
        RequestParam(r => r.DefaultAccountId, "Account preselected when adding a transaction, if the user can see it.");
        Responses[200] = "The saved settings.";
        Responses[400] = "Validation failed, or the reporting currency could not be changed because a rate is missing.";
        Responses[403] = "Only administrators can change settings.";
    }
}
