using JxFinance.Domain.Settings;

namespace JxFinance.Common.Settings;

public interface IInstanceSettingsStore
{
    InstanceSettingsSnapshot Current { get; }

    InstanceSettings Defaults();

    void Set(InstanceSettings settings);
}
