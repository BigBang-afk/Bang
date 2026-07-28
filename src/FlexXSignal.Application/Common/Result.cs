namespace FlexXSignal.Application.Common;

public class Result
{
    public bool Succeeded { get; }
    public IReadOnlyList<string> Errors { get; }

    protected Result(bool succeeded, IEnumerable<string> errors)
    {
        Succeeded = succeeded;
        Errors = errors.ToList();
    }

    public static Result Success() => new(true, Array.Empty<string>());
    public static Result Failure(params string[] errors) => new(false, errors);
    public static Result Failure(IEnumerable<string> errors) => new(false, errors);
}

public sealed class Result<T> : Result
{
    public T? Value { get; }

    private Result(bool succeeded, T? value, IEnumerable<string> errors) : base(succeeded, errors) => Value = value;

    public static Result<T> Success(T value) => new(true, value, Array.Empty<string>());
    public new static Result<T> Failure(params string[] errors) => new(false, default, errors);
    public new static Result<T> Failure(IEnumerable<string> errors) => new(false, default, errors);
}

public sealed class PagedResult<T>
{
    public required IReadOnlyList<T> Items { get; init; }
    public required int TotalCount { get; init; }
    public required int Page { get; init; }
    public required int PageSize { get; init; }
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}
