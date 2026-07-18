using System.ComponentModel;
using System.Reflection;

namespace ZarghoonJewellers.Presentation.Controls;

/// <summary>
/// A <see cref="BindingList{T}"/> that actually supports the DataGridView's built-in
/// click-a-column-header-to-sort behavior. Plain BindingList&lt;T&gt; reports
/// <see cref="IBindingList.SupportsSorting"/> as false, so grids bound to it silently ignore
/// header clicks; this fills in <see cref="ApplySortCore"/>/<see cref="IsSortedCore"/> with a
/// straightforward reflection-based comparer so every grid in the app can offer real sorting
/// without hand-rolling per-column comparers.
/// </summary>
public class SortableBindingList<T> : BindingList<T>
{
    private bool _isSorted;
    private ListSortDirection _sortDirection = ListSortDirection.Ascending;
    private PropertyDescriptor? _sortProperty;

    public SortableBindingList() { }
    public SortableBindingList(IEnumerable<T> items) : base(new List<T>(items)) { }

    protected override bool SupportsSortingCore => true;
    protected override bool IsSortedCore => _isSorted;
    protected override ListSortDirection SortDirectionCore => _sortDirection;
    protected override PropertyDescriptor? SortPropertyCore => _sortProperty;

    protected override void ApplySortCore(PropertyDescriptor prop, ListSortDirection direction)
    {
        var items = Items as List<T> ?? new List<T>(Items);

        int Compare(T a, T b)
        {
            var valueA = prop.GetValue(a);
            var valueB = prop.GetValue(b);

            int result;
            if (valueA is IComparable comparableA)
                result = comparableA.CompareTo(valueB);
            else
                result = string.Compare(valueA?.ToString(), valueB?.ToString(), StringComparison.OrdinalIgnoreCase);

            return direction == ListSortDirection.Ascending ? result : -result;
        }

        items.Sort(Compare);

        _sortProperty = prop;
        _sortDirection = direction;
        _isSorted = true;

        ResetBindings();
    }

    protected override void RemoveSortCore()
    {
        _isSorted = false;
        _sortProperty = null;
    }

    /// <summary>Replaces the entire contents in one shot (used when filters/search change) without
    /// tearing down and re-attaching the DataGridView's DataSource.</summary>
    public void ResetItems(IEnumerable<T> items)
    {
        RaiseListChangedEvents = false;
        ClearItems();
        foreach (var item in items) Add(item);
        RaiseListChangedEvents = true;
        ResetBindings();
    }
}
