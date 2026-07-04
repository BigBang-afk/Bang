using System.Collections.Generic;
using NUnit.Framework;
using RoyaleClash.Cards;
using RoyaleClash.Core;

namespace RoyaleClash.Tests.EditMode
{
    public class DeckTests
    {
        private static Deck MakeDeck(IEnumerable<string> cardIds, IEnumerable<string> evolutionIds = null)
        {
            return new Deck
            {
                CardIds = new List<string>(cardIds),
                EvolutionCardIds = evolutionIds == null ? new List<string>() : new List<string>(evolutionIds),
            };
        }

        private static readonly string[] EightUniqueCards =
        {
            "troop_vanguard_recruit", "troop_longbow_skirmisher", "troop_cinderpup_pack",
            "troop_riftwing_swarm", "troop_rubble_slinger", "building_bulwark_turret",
            "spell_emberlash_bolt", "spell_aether_barrier",
        };

        [Test]
        public void ExactlyEightUniqueCards_IsValid()
        {
            Deck deck = MakeDeck(EightUniqueCards);
            GameResultAssertSuccess(deck.Validate(null));
        }

        [Test]
        public void FewerThanEightCards_IsInvalid()
        {
            Deck deck = MakeDeck(new[] { "troop_vanguard_recruit", "troop_longbow_skirmisher" });
            GameResultAssertFailure(deck.Validate(null));
        }

        [Test]
        public void DuplicateCards_IsInvalid()
        {
            var ids = new List<string>(EightUniqueCards);
            ids[7] = ids[0]; // duplicate the first card
            Deck deck = MakeDeck(ids);
            GameResultAssertFailure(deck.Validate(null));
        }

        [Test]
        public void TwoEvolutionSlotsFromDeckCards_IsValid()
        {
            Deck deck = MakeDeck(EightUniqueCards, new[] { EightUniqueCards[0], EightUniqueCards[1] });
            GameResultAssertSuccess(deck.Validate(null));
        }

        [Test]
        public void MoreThanTwoEvolutionSlots_IsInvalid()
        {
            Deck deck = MakeDeck(EightUniqueCards, new[] { EightUniqueCards[0], EightUniqueCards[1], EightUniqueCards[2] });
            GameResultAssertFailure(deck.Validate(null));
        }

        [Test]
        public void EvolutionSlotNotInDeck_IsInvalid()
        {
            Deck deck = MakeDeck(EightUniqueCards, new[] { "troop_not_in_deck" });
            GameResultAssertFailure(deck.Validate(null));
        }

        private static void GameResultAssertSuccess(GameResult result) => Assert.IsTrue(result.Success, result.Error);
        private static void GameResultAssertFailure(GameResult result) => Assert.IsFalse(result.Success);
    }
}
