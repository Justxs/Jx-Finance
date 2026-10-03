using JxFinance.Common;
using JxFinance.Common.OpenApi;
using JxFinance.Domain.Settings;

namespace JxFinance.Endpoints.Contacts;

public sealed class ContactsGroup() : ApiGroup(ApiTags.Contacts, Feature.People, tokenReadable: true);
