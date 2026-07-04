using UnityEngine;
using UnityEngine.AddressableAssets;

namespace RoyaleClash.Cards
{
    /// <summary>
    /// An alternate, more powerful form of a base card, unlocked via Economy (evolution
    /// shards, see Module 6) and selectable for up to two deck slots per the Deck rules.
    /// </summary>
    [CreateAssetMenu(menuName = "Royale Clash/Cards/Evolution", fileName = "NewEvolution")]
    public sealed class EvolutionDefinition : ScriptableObject
    {
        [Header("Identity")]
        public string EvolutionName;
        [TextArea(2, 4)] public string Description;

        [Header("Presentation")]
        public AssetReferenceGameObject EvolvedPrefab;
        public Sprite EvolvedIcon;

        [Header("Bonus Effect")]
        [Tooltip("Extra ability granted only while this card is in its evolved state.")]
        public AbilityDefinition BonusAbility;
        [Tooltip("Flat percentage bonus applied to the base card's primary stat (e.g. +15% damage).")]
        [Range(0f, 1f)] public float StatBonusPercent = 0.15f;

        [Header("Economy")]
        [Tooltip("Evolution shards required to unlock this evolution (Economy Module 6 consumes this).")]
        public int ShardsRequired = 25;
    }
}
