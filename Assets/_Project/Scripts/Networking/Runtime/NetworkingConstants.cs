namespace RoyaleClash.Networking
{
    public static class NetworkingConstants
    {
        /// <summary>Kept equal to Battle's own fixed step so the Fusion tick and the simulation's Fix64 timestep never drift apart.</summary>
        public const float SimulationTickRateHz = RoyaleClash.Battle.BattleConstants.SimulationTickRateHz;

        public const float ReconnectGracePeriodSeconds = 30f;
        public const int MaxReconnectAttempts = 5;

        /// <summary>1v1 today; raised to 4 if/when 2v2 is added — every mapping in this module already keys off PlayerSlot rather than assuming exactly two.</summary>
        public const int MaxPlayersPerMatch = 2;
    }
}
