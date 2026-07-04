using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.Local
{
    /// <summary>
    /// Runs registered local functions instead of a real server round-trip — for Practice
    /// mode, this lets chest-opening/reward logic (Module 6) share one contract
    /// (ICloudFunctionsService.ExecuteAsync) with its real, server-authoritative
    /// PlayFab CloudScript equivalent, rather than needing an entirely separate code path.
    /// </summary>
    public sealed class LocalCloudFunctionsService : ICloudFunctionsService
    {
        private readonly Dictionary<string, Func<object, object>> _functions = new Dictionary<string, Func<object, object>>();

        public void RegisterFunction<TArgs, TResult>(string name, Func<TArgs, TResult> function) =>
            _functions[name] = args => function((TArgs)args);

        public Task<GameResult<TResult>> ExecuteAsync<TArgs, TResult>(string functionName, TArgs args)
        {
            if (!_functions.TryGetValue(functionName, out Func<object, object> fn))
                return Task.FromResult(GameResult<TResult>.Fail($"No local function registered for '{functionName}'."));

            try
            {
                var result = (TResult)fn(args);
                return Task.FromResult(GameResult<TResult>.Ok(result));
            }
            catch (Exception ex)
            {
                return Task.FromResult(GameResult<TResult>.Fail(ex.Message));
            }
        }
    }
}
