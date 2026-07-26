namespace FXVolumeTrader.Infrastructure.Security;

/// <summary>
/// Masks sensitive values (API keys, tokens, account identifiers) before
/// they are written to logs, error messages, or the UI. FX Volume Trader
/// never logs credentials, but this exists as defense in depth for any
/// value a future OfficialApi provider might otherwise expose.
/// </summary>
public static class SensitiveDataMasker
{
    /// <summary>
    /// Returns a masked representation showing only the last
    /// <paramref name="visibleTrailingChars"/> characters, e.g. "********ab12".
    /// </summary>
    public static string Mask(string? value, int visibleTrailingChars = 4)
    {
        if (string.IsNullOrEmpty(value))
        {
            return string.Empty;
        }

        if (value.Length <= visibleTrailingChars)
        {
            return new string('*', value.Length);
        }

        var visible = value[^visibleTrailingChars..];
        return new string('*', value.Length - visibleTrailingChars) + visible;
    }
}
