using System.Collections.Generic;
using System.Threading.Tasks;
using RoyaleClash.Core;

namespace RoyaleClash.Backend.Local
{
    public sealed class LocalPlayerStatsService : IPlayerStatsService
    {
        private readonly Dictionary<string, int> _stats = new Dictionary<string, int>();

        public Task<GameResult> UpdateStatisticAsync(string statName, int value)
        {
            _stats[statName] = value;
            return Task.FromResult(GameResult.Successful);
        }

        public Task<GameResult<int>> GetStatisticAsync(string statName) =>
            Task.FromResult(GameResult<int>.Ok(_stats.GetValueOrDefault(statName)));
    }
}
