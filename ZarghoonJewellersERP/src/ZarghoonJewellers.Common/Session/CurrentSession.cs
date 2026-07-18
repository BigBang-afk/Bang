namespace ZarghoonJewellers.Common.Session;

/// <summary>
/// Holds the identity of the currently logged-in user for the lifetime of the desktop
/// process. Registered as a singleton in the DI container so every service/form can ask
/// "who is logged in" and "what can they do" without threading a parameter through every
/// method call.
/// </summary>
public class CurrentSession
{
    public int UserId { get; private set; }
    public string Username { get; private set; } = string.Empty;
    public string FullName { get; private set; } = string.Empty;
    public int RoleId { get; private set; }
    public string RoleName { get; private set; } = string.Empty;
    public bool IsAuthenticated { get; private set; }
    public DateTime LoginTime { get; private set; }

    /// <summary>Flattened permission set: "ModuleName.Verb" -> granted, e.g. "Stock.CanEdit".</summary>
    private readonly HashSet<string> _grantedPermissionKeys = new(StringComparer.OrdinalIgnoreCase);

    public void SignIn(int userId, string username, string fullName, int roleId, string roleName, IEnumerable<string> grantedPermissionKeys)
    {
        UserId = userId;
        Username = username;
        FullName = fullName;
        RoleId = roleId;
        RoleName = roleName;
        IsAuthenticated = true;
        LoginTime = DateTime.Now;

        _grantedPermissionKeys.Clear();
        foreach (var key in grantedPermissionKeys)
            _grantedPermissionKeys.Add(key);
    }

    public void SignOut()
    {
        UserId = 0;
        Username = string.Empty;
        FullName = string.Empty;
        RoleId = 0;
        RoleName = string.Empty;
        IsAuthenticated = false;
        _grantedPermissionKeys.Clear();
    }

    /// <summary>e.g. HasPermission("Stock", "CanEdit")</summary>
    public bool HasPermission(string moduleName, string verb) =>
        RoleName.Equals("Administrator", StringComparison.OrdinalIgnoreCase)
        || _grantedPermissionKeys.Contains($"{moduleName}.{verb}");
}
