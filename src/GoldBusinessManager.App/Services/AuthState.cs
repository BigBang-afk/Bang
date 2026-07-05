using GoldBusinessManager.Core.Entities;

namespace GoldBusinessManager.App.Services;

/// <summary>
/// Holds the currently logged-in user for the lifetime of the app session.
/// Registered as a singleton so every page can check who is logged in and
/// what they're allowed to do (see User.CanManage* permission flags).
/// </summary>
public class AuthState
{
    public User? CurrentUser { get; private set; }

    public bool IsLoggedIn => CurrentUser is not null;

    public event Action? Changed;

    public void SignIn(User user)
    {
        CurrentUser = user;
        Changed?.Invoke();
    }

    public void SignOut()
    {
        CurrentUser = null;
        Changed?.Invoke();
    }
}
