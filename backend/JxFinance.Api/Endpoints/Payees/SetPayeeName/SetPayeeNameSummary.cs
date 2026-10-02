using FastEndpoints;

namespace JxFinance.Endpoints.Payees.SetPayeeName;

public sealed class SetPayeeNameSummary : Summary<SetPayeeNameEndpoint, SetPayeeNameRequest>
{
    public SetPayeeNameSummary()
    {
        Summary = "Name a payee";
        Description = "Gives a payee a display name, or renames it. The payee is normalized the way every "
            + "transaction's payee key is, so a raw bank description such as \"MAXIMA LT 1234 VILNIUS\" and a "
            + "payeeKey from the report name the same payee. The name is yours alone and changes no transaction.";
        ExampleRequest = new SetPayeeNameRequest("MAXIMA LT 1234 VILNIUS", "Maxima");
        RequestParam(r => r.Payee, "A bank description or a payee key, at most 500 characters.");
        RequestParam(r => r.Name, "The display name, at most 100 characters.");
        Responses[200] = "The payee's name as stored.";
        Responses[400] = "Validation failed, or nothing is left of the payee after normalizing (text.invalidFormat).";
        Responses[409] = "The same payee was named from another window at the same moment (conflict.busy). Try again.";
    }
}
