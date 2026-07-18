using System.Windows.Forms;

namespace ZarghoonJewellers.Common.Theming;

/// <summary>
/// Lightweight, dependency-free animation helpers for WinForms. WinForms has no built-in
/// easing/animation engine, so this drives a <see cref="System.Windows.Forms.Timer"/> at ~60fps
/// and interpolates the requested property. Used for the sidebar width, panel fade-in on
/// navigation, and the login card entrance.
/// </summary>
public static class UIAnimator
{
    private const int TickIntervalMs = 15; // ~66fps

    /// <summary>Smoothly animates a control's Width between its current value and <paramref name="targetWidth"/>.</summary>
    public static void AnimateWidth(Control control, int targetWidth, int durationMs = 220, Action? onComplete = null)
    {
        int startWidth = control.Width;
        int delta = targetWidth - startWidth;
        if (delta == 0)
        {
            onComplete?.Invoke();
            return;
        }

        var stepCount = Math.Max(1, durationMs / TickIntervalMs);
        var currentStep = 0;

        var timer = new Timer { Interval = TickIntervalMs };
        timer.Tick += (_, _) =>
        {
            currentStep++;
            double progress = EaseOutCubic((double)currentStep / stepCount);
            control.Width = startWidth + (int)(delta * progress);

            if (currentStep >= stepCount)
            {
                control.Width = targetWidth;
                timer.Stop();
                timer.Dispose();
                onComplete?.Invoke();
            }
        };
        timer.Start();
    }

    /// <summary>Fades a control in from transparent to fully opaque by animating its parent-relative
    /// opacity via a simple alpha-blend trick (WinForms controls have no native Opacity, only Forms do,
    /// so for UserControls we simulate the fade by animating a covering overlay's alpha instead).
    /// For top-level forms (e.g. the login window) this animates the real <see cref="Form.Opacity"/>.</summary>
    public static void FadeIn(Form form, int durationMs = 250)
    {
        form.Opacity = 0;
        form.Show();

        var stepCount = Math.Max(1, durationMs / TickIntervalMs);
        var currentStep = 0;

        var timer = new Timer { Interval = TickIntervalMs };
        timer.Tick += (_, _) =>
        {
            currentStep++;
            double progress = EaseOutCubic((double)currentStep / stepCount);
            form.Opacity = Math.Min(1.0, progress);

            if (currentStep >= stepCount)
            {
                form.Opacity = 1.0;
                timer.Stop();
                timer.Dispose();
            }
        };
        timer.Start();
    }

    /// <summary>Slides a control in horizontally from an offset, used for the content panel when
    /// switching sidebar sections so navigation feels animated rather than an abrupt swap.</summary>
    public static void SlideIn(Control control, int fromOffsetX = 40, int durationMs = 200)
    {
        int targetLeft = control.Left;
        int startLeft = targetLeft + fromOffsetX;
        control.Left = startLeft;

        var stepCount = Math.Max(1, durationMs / TickIntervalMs);
        var currentStep = 0;

        var timer = new Timer { Interval = TickIntervalMs };
        timer.Tick += (_, _) =>
        {
            currentStep++;
            double progress = EaseOutCubic((double)currentStep / stepCount);
            control.Left = startLeft + (int)((targetLeft - startLeft) * progress);

            if (currentStep >= stepCount)
            {
                control.Left = targetLeft;
                timer.Stop();
                timer.Dispose();
            }
        };
        timer.Start();
    }

    private static double EaseOutCubic(double t)
    {
        t = Math.Clamp(t, 0, 1);
        double f = t - 1;
        return f * f * f + 1;
    }
}
