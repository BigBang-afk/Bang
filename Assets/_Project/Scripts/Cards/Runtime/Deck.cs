using System.Collections.Generic;
using System.Linq;
using RoyaleClash.Core;

namespace RoyaleClash.Cards
{
    /// <summary>
    /// A player's 8-card battle deck plus up to two chosen evolution slots. Plain
    /// serializable data (not a ScriptableObject) so it round-trips through PlayFab
    /// cloud save as JSON. Validation is pure and Unity-independent so it's unit testable.
    /// </summary>
    [System.Serializable]
    public sealed class Deck
    {
        public const int RequiredCardCount = 8;
        public const int MaxEvolutionSlots = 2;

        public List<string> CardIds = new List<string>();
        public List<string> EvolutionCardIds = new List<string>();

        public GameResult Validate(CardDatabase database)
        {
            if (CardIds == null || CardIds.Count != RequiredCardCount)
                return GameResult.Fail($"Deck must contain exactly {RequiredCardCount} cards.");

            if (CardIds.Distinct().Count() != CardIds.Count)
                return GameResult.Fail("Deck cannot contain duplicate cards.");

            if (EvolutionCardIds != null && EvolutionCardIds.Count > MaxEvolutionSlots)
                return GameResult.Fail($"Deck cannot have more than {MaxEvolutionSlots} evolution slots.");

            if (EvolutionCardIds != null)
            {
                foreach (string evoId in EvolutionCardIds)
                {
                    if (!CardIds.Contains(evoId))
                        return GameResult.Fail($"Evolution slot '{evoId}' must reference a card already in the deck.");
                }
            }

            if (database != null)
            {
                foreach (string id in CardIds)
                {
                    if (!database.TryGet(new CardId(id), out CardDefinition card))
                        return GameResult.Fail($"Unknown card id '{id}'.");

                    bool wantsEvolution = EvolutionCardIds != null && EvolutionCardIds.Contains(id);
                    if (wantsEvolution && card.Evolution == null)
                        return GameResult.Fail($"Card '{id}' has no evolution to select.");
                }
            }

            return GameResult.Successful;
        }

        public float AverageElixirCost(CardDatabase database)
        {
            if (database == null || CardIds == null || CardIds.Count == 0)
                return 0f;

            int total = 0;
            int found = 0;
            foreach (string id in CardIds)
            {
                if (database.TryGet(new CardId(id), out CardDefinition card))
                {
                    total += card.ElixirCost;
                    found++;
                }
            }
            return found == 0 ? 0f : (float)total / found;
        }
    }
}
