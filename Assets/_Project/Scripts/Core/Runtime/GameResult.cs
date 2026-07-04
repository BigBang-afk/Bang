namespace RoyaleClash.Core
{
    /// <summary>
    /// Explicit success/failure result for boundary operations (backend calls,
    /// network RPCs, purchase validation) so failure paths can't be ignored by
    /// forgetting a try/catch. Prefer this over throwing for expected failure modes.
    /// </summary>
    public readonly struct GameResult<T>
    {
        public readonly bool Success;
        public readonly T Value;
        public readonly string Error;

        private GameResult(bool success, T value, string error)
        {
            Success = success;
            Value = value;
            Error = error;
        }

        public static GameResult<T> Ok(T value) => new GameResult<T>(true, value, null);
        public static GameResult<T> Fail(string error) => new GameResult<T>(false, default, error);
    }

    public readonly struct GameResult
    {
        public readonly bool Success;
        public readonly string Error;

        private GameResult(bool success, string error)
        {
            Success = success;
            Error = error;
        }

        public static readonly GameResult Successful = new GameResult(true, null);
        public static GameResult Fail(string error) => new GameResult(false, error);
    }
}
