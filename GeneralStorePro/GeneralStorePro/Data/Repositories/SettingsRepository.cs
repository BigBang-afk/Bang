using System.Collections.Generic;
using System.Linq;
using Dapper;

namespace GeneralStorePro.Data.Repositories;

public static class SettingsRepository
{
    public static Dictionary<string, string> GetAll()
    {
        using var connection = DbConnectionFactory.CreateConnection();
        var rows = connection.Query<SettingRow>("SELECT SettingKey, SettingValue FROM Settings;");
        return rows.ToDictionary(r => r.SettingKey, r => r.SettingValue);
    }

    private sealed class SettingRow
    {
        public string SettingKey { get; set; } = string.Empty;
        public string SettingValue { get; set; } = string.Empty;
    }
}
