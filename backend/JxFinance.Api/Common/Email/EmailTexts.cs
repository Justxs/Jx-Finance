using System.Globalization;
using JxFinance.Common.Formats;
using JxFinance.Common.Localization;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Common.Email;

public static class EmailTexts
{
    public const string DefaultProduct = "Jx Finance";

    public static string Product(string? instanceName) =>
        string.IsNullOrWhiteSpace(instanceName) ? DefaultProduct : instanceName.Trim();

    public static bool IsLithuanian(string? language) =>
        language?.StartsWith(AppLanguages.Lt, StringComparison.OrdinalIgnoreCase) == true;

    public static OutgoingEmail PasswordReset(
        string language,
        string toAddress,
        string toName,
        string link,
        int validForMinutes,
        string product) =>
        Compose(
            language,
            toAddress,
            toName,
            product,
            ("slaptažodžio atkūrimas",
                $"""
                kažkas paprašė atkurti jūsų {product} slaptažodį. Atidarykite šią nuorodą ir įveskite naują slaptažodį:

                {link}

                Nuoroda galioja {validForMinutes} min. ir veikia tik vieną kartą.

                Jei atkurti slaptažodžio neprašėte, nieko daryti nereikia: slaptažodis nepasikeitė.
                """),
            ("reset your password",
                $"""
                somebody asked to reset your {product} password. Open this link and type a new password:

                {link}

                The link is valid for {validForMinutes} minutes and works once.

                If you did not ask for this, there is nothing to do: your password has not changed.
                """));

    public static OutgoingEmail Verification(
        string language,
        string toAddress,
        string toName,
        string link,
        string product) =>
        Compose(
            language,
            toAddress,
            toName,
            product,
            ("patvirtinkite el. pašto adresą",
                $"""
                šis adresas nurodytas jūsų {product} paskyroje. Patvirtinkite jį atidarydami nuorodą:

                {link}

                Kol adresas nepatvirtintas, paskyra veikia įprastai; tiesiog į šį adresą nesiunčiami laiškai.
                """),
            ("confirm your email address",
                $"""
                this address is on your {product} account. Confirm it by opening this link:

                {link}

                Until it is confirmed your account works as usual; only mail to this address is held back.
                """));

    public static OutgoingEmail BillReminder(
        string language,
        string toAddress,
        string toName,
        string billName,
        DateOnly dueDate,
        RecurringBillShape shape,
        string product)
    {
        var date = dueDate.ToString(DateFormats.IsoDate, CultureInfo.InvariantCulture);
        var sentence = shape switch
        {
            RecurringBillShape.Income => $"„{billName}“ įplaukos data – {date}.",
            RecurringBillShape.Transfer => $"„{billName}“ pervedimo data – {date}.",
            _ => $"„{billName}“ mokėjimo data – {date}.",
        };
        var line = shape switch
        {
            RecurringBillShape.Income => $"\"{billName}\" is due to arrive on {date}.",
            RecurringBillShape.Transfer => $"\"{billName}\" is due to be transferred on {date}.",
            _ => $"\"{billName}\" is due to be paid on {date}.",
        };
        return Compose(
            language,
            toAddress,
            toName,
            product,
            ($"{billName} – {date}",
                $"""
                {sentence}

                Patvirtinti įrašą galite {product} skiltyje „Pasikartojantys įrašai“.

                Šiuos laiškus galite išjungti savo profilyje.
                """),
            ($"{billName} on {date}",
                $"""
                {line}

                You can confirm the entry in {product} under "Recurring entries".

                You can switch these emails off on your profile.
                """));
    }

    public static OutgoingEmail Test(string language, string toAddress, string toName, string product) =>
        Compose(
            language,
            toAddress,
            toName,
            product,
            ("bandomasis laiškas",
                $"""
                šis laiškas išsiųstas iš {product} nustatymų, kad patikrintumėte SMTP serverio duomenis.

                Jei jį gavote, el. pašto siuntimas veikia.
                """),
            ("test message",
                $"""
                this message was sent from the {product} settings to check the mail server details.

                If it arrived, email delivery works.
                """));

    private static OutgoingEmail Compose(
        string language,
        string toAddress,
        string toName,
        string product,
        (string Subject, string Body) lt,
        (string Subject, string Body) en)
    {
        var lithuanian = IsLithuanian(language);
        var (subject, body) = lithuanian ? lt : en;
        var name = string.IsNullOrWhiteSpace(toName) ? toAddress : toName.Trim();
        return new OutgoingEmail(
            toAddress,
            toName,
            $"{product}: {subject}",
            $"""
            {(lithuanian ? "Sveiki," : "Hello")} {name},

            {body}

            {product}
            """);
    }
}
