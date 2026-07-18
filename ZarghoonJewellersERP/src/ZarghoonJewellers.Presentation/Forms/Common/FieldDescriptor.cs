namespace ZarghoonJewellers.Presentation.Forms.Common;

/// <summary>Describes one editable field on a metadata-driven add/edit dialog (<see cref="SimpleEditForm{TEntity}"/>):
/// how to read the current value out of the entity for display, and how to write an edited
/// string back onto it when the user saves.</summary>
public class FieldDescriptor<TEntity>
{
    public string Label { get; }
    public Func<TEntity, string> Getter { get; }
    public Action<TEntity, string> Setter { get; }
    public bool IsPassword { get; }
    public bool ReadOnly { get; }

    public FieldDescriptor(string label, Func<TEntity, string> getter, Action<TEntity, string> setter, bool isPassword = false, bool readOnly = false)
    {
        Label = label;
        Getter = getter;
        Setter = setter;
        IsPassword = isPassword;
        ReadOnly = readOnly;
    }
}

/// <summary>Describes one read-only column on a metadata-driven list grid (<see cref="SimpleCrudControl{TEntity}"/>).</summary>
public class GridColumnDescriptor<TEntity>
{
    public string Header { get; }
    public Func<TEntity, object?> ValueGetter { get; }

    public GridColumnDescriptor(string header, Func<TEntity, object?> valueGetter)
    {
        Header = header;
        ValueGetter = valueGetter;
    }
}
