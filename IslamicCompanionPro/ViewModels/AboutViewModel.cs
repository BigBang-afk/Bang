using CommunityToolkit.Mvvm.Input;

namespace IslamicCompanionPro.ViewModels;

public partial class AboutViewModel : BaseViewModel
{
	public string AppVersion => AppInfo.Current.VersionString;
	public string BuildNumber => AppInfo.Current.BuildString;

	public AboutViewModel()
	{
		Title = "About";
	}

	[RelayCommand]
	private async Task OpenPrivacyPolicyAsync()
	{
		// Replace with your published privacy policy URL before release (required by both stores).
		await Launcher.Default.OpenAsync("https://example.com/islamic-companion-pro/privacy");
	}
}
