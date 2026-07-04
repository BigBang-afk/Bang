using System.Collections.Generic;
using RoyaleClash.Core;
using UnityEngine;

namespace RoyaleClash.Cards
{
    /// <summary>
    /// Single source of truth listing every card in the game. Populated by the Editor tool
    /// "Royale Clash/Cards/Rebuild Card Database" (scans Assets/_Project/Data/Cards) rather
    /// than edited by hand, so it can never drift out of sync with the actual assets.
    /// </summary>
    [CreateAssetMenu(menuName = "Royale Clash/Cards/Card Database", fileName = "CardDatabase")]
    public sealed class CardDatabase : ScriptableObject
    {
        [SerializeField] private List<CardDefinition> cards = new List<CardDefinition>();

        public IReadOnlyList<CardDefinition> Cards => cards;

        private Dictionary<CardId, CardDefinition> _lookup;

        public void SetCards(List<CardDefinition> newCards)
        {
            cards = newCards;
            _lookup = null;
        }

        public bool TryGet(CardId id, out CardDefinition definition)
        {
            _lookup ??= BuildLookup();
            return _lookup.TryGetValue(id, out definition);
        }

        private Dictionary<CardId, CardDefinition> BuildLookup()
        {
            var map = new Dictionary<CardId, CardDefinition>(cards.Count);
            foreach (CardDefinition card in cards)
            {
                if (card == null) continue;
                map[card.Id] = card;
            }
            return map;
        }

        private void OnValidate() => _lookup = null;
    }
}
