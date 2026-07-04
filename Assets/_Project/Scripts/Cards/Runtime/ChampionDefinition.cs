using UnityEngine;

namespace RoyaleClash.Cards
{
    /// <summary>
    /// A Champion troop: a single powerful unit with one player-activated ability paid for
    /// with Elixir mid-battle, rather than a passive-only troop. Always Champion rarity.
    /// </summary>
    [CreateAssetMenu(menuName = "Royale Clash/Cards/Champion", fileName = "NewChampion")]
    public sealed class ChampionDefinition : TroopDefinition
    {
        [Header("Champion Ability")]
        public AbilityDefinition ActiveAbility;
        [Range(1, 6)] public int AbilityElixirCost = 2;
    }
}
