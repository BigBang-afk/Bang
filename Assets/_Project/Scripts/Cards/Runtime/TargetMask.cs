using System;

namespace RoyaleClash.Cards
{
    /// <summary>What an attacker (troop, building, tower) is allowed to acquire as a target.</summary>
    [Flags]
    public enum TargetMask
    {
        None = 0,
        Ground = 1 << 0,
        Air = 1 << 1,
        BuildingsOnly = 1 << 2,
        GroundAndAir = Ground | Air,
    }
}
