using RoyaleClash.Core;
using UnityEngine;
using UnityEngine.AddressableAssets;

namespace RoyaleClash.Cards
{
    /// <summary>
    /// Base data asset for every card in the game. Concrete cards are one of
    /// <see cref="TroopDefinition"/>, <see cref="BuildingDefinition"/>, or
    /// <see cref="SpellDefinition"/>. All gameplay-affecting fields live here or on the
    /// subclass — there is no card-specific code anywhere in the project.
    /// </summary>
    public abstract class CardDefinition : ScriptableObject
    {
        [Header("Identity")]
        [Tooltip("Stable, unique id referenced by decks, saves, and network messages. Never change once shipped.")]
        public string CardIdValue;

        public string DisplayName;
        [TextArea(2, 6)] public string Lore;
        public CardRarity Rarity;
        [Range(1, 10)] public int ElixirCost = 3;
        public Sprite Icon;

        [Header("Presentation (Addressables)")]
        [Tooltip("Addressable reference to the gameplay prefab. Left unassigned until art is ready; " +
                 "the Battle view layer falls back to a labeled placeholder primitive if unset.")]
        public AssetReferenceGameObject Prefab;

        [Header("Evolution")]
        [Tooltip("Optional. Present only for cards that have an evolved form.")]
        public EvolutionDefinition Evolution;

        public abstract CardType Type { get; }

        public CardId Id => new CardId(CardIdValue);

        /// <summary>Applies this rarity's per-level growth curve to a base stat value.</summary>
        protected float ScaleStat(float baseValue, int level, CardLevelCurve curve)
            => curve == null ? baseValue : curve.ScaleStat(baseValue, Rarity, level);
    }
}
