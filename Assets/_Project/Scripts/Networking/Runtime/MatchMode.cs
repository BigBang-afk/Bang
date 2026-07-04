namespace RoyaleClash.Networking
{
    /// <summary>How a match is hosted/matched. Drives GameMode selection in the Fusion layer (see MatchmakingService).</summary>
    public enum MatchMode
    {
        /// <summary>Fully local, no networking: solo practice / training camp / AI battle.</summary>
        Practice,
        Friendly,
        Ranked,
        Private,
        Tournament,
        Spectator,
    }
}
