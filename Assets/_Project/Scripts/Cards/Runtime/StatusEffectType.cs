namespace RoyaleClash.Cards
{
    /// <summary>Status effects spells/abilities can apply. Interpreted by the Battle simulation.</summary>
    public enum StatusEffectType
    {
        None = 0,
        Stun = 1,
        Slow = 2,
        Freeze = 3,
        Rage = 4,
        DamageOverTime = 5,
        Knockback = 6,
        Shield = 7,
        Haste = 8,
    }
}
