using System.Collections.Generic;
using RoyaleClash.Cards;
using UnityEditor;
using UnityEngine;

namespace RoyaleClash.EditorTools.Cards
{
    /// <summary>
    /// Scans Assets/_Project/Data/Cards for every CardDefinition asset and writes the result
    /// into the single project-wide CardDatabase asset. Run automatically after the roster
    /// generator, or manually via the menu after adding/removing a card asset by hand.
    /// </summary>
    public static class CardDatabaseBuilder
    {
        private const string DatabasePath = "Assets/_Project/Data/Cards/CardDatabase.asset";

        [MenuItem("Royale Clash/Cards/Rebuild Card Database")]
        public static void Rebuild()
        {
            var database = AssetDatabase.LoadAssetAtPath<CardDatabase>(DatabasePath);
            if (database == null)
            {
                database = ScriptableObject.CreateInstance<CardDatabase>();
                AssetDatabase.CreateAsset(database, DatabasePath);
            }

            var cards = new List<CardDefinition>();
            var seenIds = new HashSet<string>();
            foreach (string guid in AssetDatabase.FindAssets("t:CardDefinition", new[] { "Assets/_Project/Data/Cards" }))
            {
                string path = AssetDatabase.GUIDToAssetPath(guid);
                var card = AssetDatabase.LoadAssetAtPath<CardDefinition>(path);
                if (card == null) continue;

                if (!seenIds.Add(card.CardIdValue))
                    Debug.LogError($"Royale Clash: duplicate card id '{card.CardIdValue}' found at {path}.");

                cards.Add(card);
            }

            database.SetCards(cards);
            EditorUtility.SetDirty(database);
            AssetDatabase.SaveAssets();

            Debug.Log($"Royale Clash: card database rebuilt with {cards.Count} cards.");
        }
    }
}
