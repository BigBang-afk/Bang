namespace RoyaleClash.Cards
{
    /// <summary>
    /// Identifies which concrete ability behavior an <see cref="AbilityDefinition"/> maps to.
    /// Cards stays pure data (no gameplay logic); the Battle simulation's ability executor
    /// (Module 3) switches on this code to run the actual effect. Adding a new ability means
    /// adding an enum value here and a matching case in Battle — never logic in this assembly.
    /// </summary>
    public enum AbilityCode
    {
        None = 0,
        SelfShieldOnActivate,
        DashStrikeOnActivate,
        HealNearbyAlliesPulse,
        SummonMinionsPeriodic,
        HasteAuraPulse,
        ChainDamageOnHit,
        ShockwaveOnDeath,
        PierceExtraTargetOnHit,
        BurnOnHit,
    }
}
