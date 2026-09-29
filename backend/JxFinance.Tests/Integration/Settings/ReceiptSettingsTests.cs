using System.Net;
using System.Net.Http.Json;
using JxFinance.Common.Errors;
using JxFinance.Common.Settings;
using JxFinance.Domain.Common;
using JxFinance.Domain.Receipts;
using JxFinance.Domain.Settings;
using JxFinance.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace JxFinance.Tests.Integration.Settings;

[Collection<IntegrationCollection>]
public sealed class ReceiptSettingsTests(ApiFixture fixture) : IntegrationTestBase(fixture)
{
    private const string ApiKey = "sk-ant-settings-secret";

    private FakeReceiptReader Reader => Services.GetRequiredService<FakeReceiptReader>();

    [Fact]
    public async Task The_key_is_stored_but_never_answered_and_an_empty_key_keeps_it()
    {
        Reader.Reset();
        var saved = await SaveAsync(new { enabled = true, apiKey = ApiKey, model = ReceiptModels.Haiku, monthlyLimit = 40 });
        var kept = await SaveAsync(new { enabled = true, apiKey = (string?)null, model = ReceiptModels.Default, monthlyLimit = 100 });
        var body = await Client.GetStringAsync("/api/settings/receipts", TestContext.Current.CancellationToken);

        Assert.True(saved.IsSuccessStatusCode);
        Assert.DoesNotContain(ApiKey, await saved.Content.ReadAsStringAsync(TestContext.Current.CancellationToken), StringComparison.Ordinal);
        Assert.DoesNotContain(ApiKey, body, StringComparison.Ordinal);
        var settings = await ReadOkAsync<ReceiptSettingsDto>(kept);
        Assert.Equal((true, true, ReceiptModels.Default, 100), (settings.Enabled, settings.HasKey, settings.Model, settings.MonthlyLimit));
        var stored = await WithDbAsync(db => db.InstanceSettings.AsNoTracking().Select(s => s.ReceiptApiKeyProtected).SingleAsync(TestContext.Current.CancellationToken));
        Assert.NotEqual(ApiKey, stored);

        Assert.Equal(HttpStatusCode.NoContent, (await Client.PostAsync("/api/settings/receipts/test", null, TestContext.Current.CancellationToken)).StatusCode);
    }

    [Fact]
    public async Task A_model_outside_the_list_is_refused()
    {
        var response = await SaveAsync(new { enabled = false, apiKey = (string?)null, model = "claude-2", monthlyLimit = 100 });

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, ErrorCodes.ReceiptModelNotAllowed);
    }

    [Fact]
    public async Task A_member_cannot_read_or_change_the_receipt_settings()
    {
        using var member = await CreateUserClientAsync();

        var read = await member.GetAsync("/api/settings/receipts", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, read.StatusCode);
    }

    [Fact]
    public async Task The_key_test_reports_a_key_the_provider_refuses()
    {
        (await SaveAsync(new { enabled = true, apiKey = ApiKey, model = ReceiptModels.Default, monthlyLimit = 100 })).EnsureSuccessStatusCode();
        Reader.Reset();
        Reader.FailWith = new DomainError(ErrorCodes.ReceiptKeyRejected, "Refused.");

        var response = await Client.PostAsync("/api/settings/receipts/test", null, TestContext.Current.CancellationToken);
        Reader.Reset();

        await AssertProblemAsync(response, HttpStatusCode.BadRequest, ErrorCodes.ReceiptKeyRejected);
    }

    [Fact]
    public async Task A_key_saved_under_another_key_ring_answers_key_unreadable()
    {
        (await SaveAsync(new { enabled = true, apiKey = ApiKey, model = ReceiptModels.Default, monthlyLimit = 100 })).EnsureSuccessStatusCode();
        await using (var on = await OverrideSettingsAsync(settings => settings["features"]!["receiptReading"] = true))
        {
            await ForeignKeyAsync();

            var test = await Client.PostAsync("/api/settings/receipts/test", null, TestContext.Current.CancellationToken);
            var settings = await Client.GetFromJsonAsync<ReadyDto>("/api/settings", TestContext.Current.CancellationToken);

            await AssertProblemAsync(test, HttpStatusCode.BadRequest, ErrorCodes.ReceiptKeyUnreadable);
            Assert.True(settings!.ReceiptReadingReady);
        }

        (await SaveAsync(new { enabled = true, apiKey = ApiKey, model = ReceiptModels.Default, monthlyLimit = 100 })).EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Switching_reading_on_without_any_key_asks_for_one()
    {
        (await SaveAsync(new { enabled = false, apiKey = (string?)null, model = ReceiptModels.Default, monthlyLimit = 100 })).EnsureSuccessStatusCode();
        await WithDbAsync(db => db.InstanceSettings.ExecuteUpdateAsync(s => s.SetProperty(i => i.ReceiptApiKeyProtected, string.Empty), TestContext.Current.CancellationToken));
        await ReloadStoreAsync();

        var response = await SaveAsync(new { enabled = true, apiKey = "", model = ReceiptModels.Default, monthlyLimit = 100 });

        await AssertValidationErrorAsync(response, "apiKey");
        (await SaveAsync(new { enabled = true, apiKey = ApiKey, model = ReceiptModels.Default, monthlyLimit = 100 })).EnsureSuccessStatusCode();
    }

    private async Task ForeignKeyAsync()
    {
        var foreign = Convert.ToBase64String(Guid.NewGuid().ToByteArray());
        await WithDbAsync(db => db.InstanceSettings.ExecuteUpdateAsync(s => s.SetProperty(i => i.ReceiptApiKeyProtected, foreign), TestContext.Current.CancellationToken));
        await ReloadStoreAsync();
    }

    private Task ReloadStoreAsync() =>
        WithDbAsync(async db =>
        {
            var row = await db.InstanceSettings.AsNoTracking().SingleAsync(s => s.Id == InstanceSettings.SingletonId, TestContext.Current.CancellationToken);
            Services.GetRequiredService<IInstanceSettingsStore>().Set(row);
        });

    private Task<HttpResponseMessage> SaveAsync(object body) =>
        Client.PutAsJsonAsync("/api/settings/receipts", body, TestContext.Current.CancellationToken);

    private sealed record ReceiptSettingsDto(bool Enabled, bool HasKey, string Model, int MonthlyLimit, int ReadingsThisMonth);

    private sealed record ReadyDto(bool ReceiptReadingReady);
}
