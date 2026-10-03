using FastEndpoints.Testing;

namespace JxFinance.Tests.Support;

public sealed class DataFixture : ApiFixture;

public sealed class DataCollection : TestCollection<DataFixture>;

public sealed class ImportsFixture : ApiFixture;

public sealed class ImportsCollection : TestCollection<ImportsFixture>;

public sealed class InvestmentsFixture : ApiFixture;

public sealed class InvestmentsCollection : TestCollection<InvestmentsFixture>;

public sealed class LedgerFixture : ApiFixture;

public sealed class LedgerCollection : TestCollection<LedgerFixture>;

public sealed class NetWorthFixture : ApiFixture;

public sealed class NetWorthCollection : TestCollection<NetWorthFixture>;

public sealed class NotificationsFixture : ApiFixture;

public sealed class NotificationsCollection : TestCollection<NotificationsFixture>;

public sealed class PeopleFixture : ApiFixture;

public sealed class PeopleCollection : TestCollection<PeopleFixture>;

public sealed class ReportsFixture : ApiFixture;

public sealed class ReportsCollection : TestCollection<ReportsFixture>;

public sealed class SetupFixture : ApiFixture;

public sealed class SetupCollection : TestCollection<SetupFixture>;
