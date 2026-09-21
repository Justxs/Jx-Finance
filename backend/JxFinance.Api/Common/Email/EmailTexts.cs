using System.Globalization;
using JxFinance.Domain.RecurringBills;

namespace JxFinance.Common.Email;

public static class EmailTexts
{
    public const string Fallback = "en";
    public const string DefaultProduct = "Jx Finance";

    public static string Product(string? instanceName) =>
        string.IsNullOrWhiteSpace(instanceName) ? DefaultProduct : instanceName.Trim();

    public static bool IsLithuanian(string? language) =>
        language?.StartsWith("lt", StringComparison.OrdinalIgnoreCase) == true;

    public static OutgoingEmail PasswordReset(
        string language,
        string toAddress,
        string toName,
        string link,
        int validForMinutes,
        string product)
    {
        var name = Greeting(toName, toAddress);
        return IsLithuanian(language)
            ? new OutgoingEmail(
                toAddress,
                toName,
                $"{product}: slaptažodžio atkūrimas",
                $"""
                Sveiki, {name},

                kažkas paprašė atkurti jūsų {product} slaptažodį. Atidarykite šią nuorodą ir įveskite naują slaptažodį:

                {link}

                Nuoroda galioja {validForMinutes} min. ir veikia tik vieną kartą.

                Jei atkurti slaptažodžio neprašėte, nieko daryti nereikia: slaptažodis nepasikeitė.

                {product}
                """)
            : new OutgoingEmail(
                toAddress,
                toName,
                $"{product}: reset your password",
                $"""
                Hello {name},

                somebody asked to reset your {product} password. Open this link and type a new password:

                {link}

                The link is valid for {validForMinutes} minutes and works once.

                If you did not ask for this, there is nothing to do: your password has not changed.

                {product}
                """);
    }

    public static OutgoingEmail Verification(
        string language,
        string toAddress,
        string toName,
        string link,
        string product)
    {
        var name = Greeting(toName, toAddress);
        return IsLithuanian(language)
            ? new OutgoingEmail(
                toAddress,
                toName,
                $"{product}: patvirtinkite el. pašto adresą",
                $"""
                Sveiki, {name},

                šis adresas nurodytas jūsų {product} paskyroje. Patvirtinkite jį atidarydami nuorodą:

                {link}

                Kol adresas nepatvirtintas, paskyra veikia įprastai; tiesiog į šį adresą nesiunčiami laiškai.

                {product}
                """)
            : new OutgoingEmail(
                toAddress,
                toName,
                $"{product}: confirm your email address",
                $"""
                Hello {name},

                this address is on your {product} account. Confirm it by opening this link:

                {link}

                Until it is confirmed your account works as usual; only mail to this address is held back.

                {product}
                """);
    }

    public static OutgoingEmail BillReminder(
        string language,
        string toAddress,
        string toName,
        string billName,
        DateOnly dueDate,
        RecurringBillShape shape,
        string product)
    {
        var name = Greeting(toName, toAddress);
        var date = dueDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        if (IsLithuanian(language))
        {
            var sentence = shape switch
            {
                RecurringBillShape.Income => $"„{billName}“ įplaukos data – {date}.",
                RecurringBillShape.Transfer => $"„{billName}“ pervedimo data – {date}.",
                _ => $"„{billName}“ mokėjimo data – {date}.",
            };
            return new OutgoingEmail(
                toAddress,
                toName,
                $"{product}: {billName} – {date}",
                $"""
                Sveiki, {name},

                {sentence}

                Patvirtinti įrašą galite {product} skiltyje „Pasikartojantys įrašai“.

                Šiuos laiškus galite išjungti savo profilyje.

                {product}
                """);
        }

        var line = shape switch
        {
            RecurringBillShape.Income => $"\"{billName}\" is due to arrive on {date}.",
            RecurringBillShape.Transfer => $"\"{billName}\" is due to be transferred on {date}.",
            _ => $"\"{billName}\" is due to be paid on {date}.",
        };
        return new OutgoingEmail(
            toAddress,
            toName,
            $"{product}: {billName} on {date}",
            $"""
            Hello {name},

            {line}

            You can confirm the entry in {product} under "Recurring entries".

            You can switch these emails off on your profile.

            {product}
            """);
    }

    public static OutgoingEmail Test(string language, string toAddress, string toName, string product)
    {
        var name = Greeting(toName, toAddress);
        return IsLithuanian(language)
            ? new OutgoingEmail(
                toAddress,
                toName,
                $"{product}: bandomasis laiškas",
                $"""
                Sveiki, {name},

                šis laiškas išsiųstas iš {product} nustatymų, kad patikrintumėte SMTP serverio duomenis.

                Jei jį gavote, el. pašto siuntimas veikia.

                {product}
                """)
            : new OutgoingEmail(
                toAddress,
                toName,
                $"{product}: test message",
                $"""
                Hello {name},

                this message was sent from the {product} settings to check the mail server details.

                If it arrived, email delivery works.

                {product}
                """);
    }

    private static string Greeting(string name, string address) =>
        string.IsNullOrWhiteSpace(name) ? address : name.Trim();
}
