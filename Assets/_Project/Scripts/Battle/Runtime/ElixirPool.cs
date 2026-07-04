using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>Per-player Elixir bar: accumulates over time and is spent on deploys/abilities.</summary>
    public sealed class ElixirPool
    {
        public Fix64 Current { get; private set; }
        public Fix64 Max { get; }

        private Fix64 _regenSecondsPerElixir;
        private Fix64 _accumulator;

        public ElixirPool(Fix64 startingElixir, Fix64 max, Fix64 regenSecondsPerElixir)
        {
            Current = startingElixir;
            Max = max;
            _regenSecondsPerElixir = regenSecondsPerElixir;
        }

        public void SetRegenRate(Fix64 secondsPerElixir) => _regenSecondsPerElixir = secondsPerElixir;

        public void Tick(Fix64 dt)
        {
            if (Current >= Max) return;

            _accumulator += dt;
            while (_accumulator >= _regenSecondsPerElixir && Current < Max)
            {
                _accumulator -= _regenSecondsPerElixir;
                Current = Fix64.Min(Max, Current + Fix64.OneValue);
            }
        }

        public bool TrySpend(Fix64 amount)
        {
            if (amount < Fix64.Zero || Current < amount) return false;
            Current -= amount;
            return true;
        }

        public void Add(Fix64 amount) => Current = Fix64.Min(Max, Current + amount);
    }
}
