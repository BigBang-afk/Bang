using System;
using UnityEngine;

namespace RoyaleClash.Cards
{
    /// <summary>
    /// Single project-wide asset defining how much a card's stats grow per level and how
    /// many levels each rarity spans. Card definitions read this instead of hardcoding
    /// growth percentages, so rebalancing the whole game is a one-asset edit.
    /// </summary>
    [CreateAssetMenu(menuName = "Royale Clash/Cards/Level Curve", fileName = "CardLevelCurve")]
    public sealed class CardLevelCurve : ScriptableObject
    {
        [Tooltip("Compounding stat growth applied per level above 1, e.g. 0.10 = +10% per level.")]
        [Range(0f, 0.5f)]
        public float GrowthPerLevel = 0.10f;

        [Tooltip("Max card level per rarity (Common cards can be levelled further than Legendary).")]
        public int[] MaxLevelByRarity = { 15, 12, 9, 7, 7 };

        public int MaxLevelFor(CardRarity rarity)
        {
            int index = (int)rarity;
            return index >= 0 && index < MaxLevelByRarity.Length ? MaxLevelByRarity[index] : 1;
        }

        /// <summary>Scales a level-1 base stat up to the requested level (clamped to the rarity's max).</summary>
        public float ScaleStat(float baseValue, CardRarity rarity, int level)
        {
            int clampedLevel = Math.Clamp(level, 1, MaxLevelFor(rarity));
            double multiplier = Math.Pow(1.0 + GrowthPerLevel, clampedLevel - 1);
            return (float)(baseValue * multiplier);
        }
    }
}
