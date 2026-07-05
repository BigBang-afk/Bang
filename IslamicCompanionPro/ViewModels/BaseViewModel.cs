using CommunityToolkit.Mvvm.ComponentModel;

namespace IslamicCompanionPro.ViewModels;

public abstract partial class BaseViewModel : ObservableObject
{
	[ObservableProperty]
	private bool isBusy;

	[ObservableProperty]
	private string title = string.Empty;

	[ObservableProperty]
	private bool hasError;

	[ObservableProperty]
	private string errorMessage = string.Empty;

	public bool IsNotBusy => !IsBusy;

	partial void OnIsBusyChanged(bool value) => OnPropertyChanged(nameof(IsNotBusy));

	protected void SetError(string message)
	{
		ErrorMessage = message;
		HasError = !string.IsNullOrEmpty(message);
	}

	protected void ClearError() => SetError(string.Empty);
}
