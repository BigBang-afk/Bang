using RoyaleClash.Cards;

namespace RoyaleClash.Networking
{
    /// <summary>What the UI (Module 7) asks for when the player taps "Battle". Mode-specific fields are null/unused as appropriate.</summary>
    public readonly struct MatchRequest
    {
        public readonly MatchMode Mode;
        public readonly Deck Deck;
        public readonly string Region;

        /// <summary>Only meaningful for Private (required) and Friendly (optional — auto-generated if absent) matches.</summary>
        public readonly string RoomCode;

        public MatchRequest(MatchMode mode, Deck deck, string region, string roomCode = null)
        {
            Mode = mode;
            Deck = deck;
            Region = region;
            RoomCode = roomCode;
        }
    }
}
