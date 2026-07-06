using GeneralStorePro.Models;

namespace GeneralStorePro.Services;

/// <summary>
/// Holds the currently signed-in user for this desktop session.
/// </summary>
public static class SessionService
{
    public static User? CurrentUser { get; set; }
}
