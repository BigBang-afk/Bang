using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using GoldLedgerApp.Services;

namespace GoldLedgerApp.ViewModels;

public enum LoginMode
{
	EnterPin,
	CreatePin,
	ConfirmPin
}

public partial class LoginViewModel : BaseViewModel
{
	private readonly AuthService _authService;
	private string _firstPinEntry = string.Empty;

	public const int PinLength = 4;

	[ObservableProperty]
	private string enteredPin = string.Empty;

	[ObservableProperty]
	private string headline = "Enter PIN";

	[ObservableProperty]
	private string subtext = "Enter your 4-digit PIN to continue";

	[ObservableProperty]
	private string errorMessage = string.Empty;

	[ObservableProperty]
	private LoginMode mode = LoginMode.EnterPin;

	public LoginViewModel(AuthService authService)
	{
		_authService = authService;
		Title = "Welcome";
	}

	public async Task InitializeAsync()
	{
		IsBusy = true;
		var pinSet = await _authService.IsPinSetAsync();
		Mode = pinSet ? LoginMode.EnterPin : LoginMode.CreatePin;
		UpdateHeadline();
		IsBusy = false;
	}

	private void UpdateHeadline()
	{
		(Headline, Subtext) = Mode switch
		{
			LoginMode.CreatePin => ("Create a PIN", "Choose a 4-digit PIN to protect your shop data"),
			LoginMode.ConfirmPin => ("Confirm PIN", "Re-enter the PIN to confirm"),
			_ => ("Welcome back", "Enter your 4-digit PIN to continue")
		};
	}

	[RelayCommand]
	private async Task AppendDigitAsync(string digit)
	{
		if (EnteredPin.Length >= PinLength) return;

		ErrorMessage = string.Empty;
		EnteredPin += digit;

		if (EnteredPin.Length == PinLength)
			await SubmitAsync();
	}

	[RelayCommand]
	private void Backspace()
	{
		if (EnteredPin.Length == 0) return;
		ErrorMessage = string.Empty;
		EnteredPin = EnteredPin[..^1];
	}

	private async Task SubmitAsync()
	{
		IsBusy = true;

		switch (Mode)
		{
			case LoginMode.CreatePin:
				_firstPinEntry = EnteredPin;
				EnteredPin = string.Empty;
				Mode = LoginMode.ConfirmPin;
				UpdateHeadline();
				break;

			case LoginMode.ConfirmPin:
				if (EnteredPin == _firstPinEntry)
				{
					await _authService.SetPinAsync(EnteredPin);
					_authService.IsSessionUnlocked = true;
					App.ShowMainApp();
				}
				else
				{
					ErrorMessage = "PINs didn't match. Start again.";
					EnteredPin = string.Empty;
					_firstPinEntry = string.Empty;
					Mode = LoginMode.CreatePin;
					UpdateHeadline();
				}
				break;

			case LoginMode.EnterPin:
				var ok = await _authService.VerifyPinAsync(EnteredPin);
				if (ok)
				{
					_authService.IsSessionUnlocked = true;
					App.ShowMainApp();
				}
				else
				{
					ErrorMessage = "Incorrect PIN. Try again.";
					EnteredPin = string.Empty;
				}
				break;
		}

		IsBusy = false;
	}
}
