namespace ZarghoonJewellers.Presentation.Forms.Common;

/// <summary>Implemented by every module UserControl that needs to (re)fetch its data from the
/// Business layer. FrmMain calls <see cref="LoadAsync"/> each time the module is navigated to,
/// so switching back to a screen always shows fresh data instead of a stale cached view.</summary>
public interface IAsyncLoadable
{
    Task LoadAsync();
}
