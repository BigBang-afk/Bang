using RoyaleClash.Core.Fixed;

namespace RoyaleClash.Battle
{
    /// <summary>Tunable match-wide constants. One place to rebalance match pacing.</summary>
    public static class BattleConstants
    {
        public static readonly Fix64 ArenaWidthTiles = Fix64.FromInt(18);
        public static readonly Fix64 ArenaLengthTiles = Fix64.FromInt(32);
        public static readonly Fix64 RiverY = Fix64.FromInt(16);
        public static readonly Fix64 BridgeLeftX = Fix64.FromFloat(3.5f);
        public static readonly Fix64 BridgeRightX = Fix64.FromFloat(14.5f);

        public static readonly Fix64 StartingElixir = Fix64.FromInt(5);
        public static readonly Fix64 MaxElixir = Fix64.FromInt(10);

        /// <summary>Seconds required to regenerate one Elixir at normal (1x) rate.</summary>
        public static readonly Fix64 NormalRegenSecondsPerElixir = Fix64.FromFloat(2.8f);
        public static readonly Fix64 DoubleElixirDivisor = Fix64.FromInt(2);
        public static readonly Fix64 TripleElixirDivisor = Fix64.FromInt(3);

        public static readonly Fix64 MatchDurationSeconds = Fix64.FromInt(180);
        public static readonly Fix64 DoubleElixirStartSeconds = Fix64.FromInt(120);
        public static readonly Fix64 OvertimeDurationSeconds = Fix64.FromInt(60);

        /// <summary>Deterministic simulation tick rate; matches the Photon Fusion default simulation tick.</summary>
        public const float SimulationTickRateHz = 20f;
        public static readonly Fix64 FixedDeltaTime = Fix64.OneValue / Fix64.FromInt((int)SimulationTickRateHz);
    }
}
