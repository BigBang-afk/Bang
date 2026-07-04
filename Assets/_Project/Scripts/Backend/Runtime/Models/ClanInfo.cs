using System;
using System.Collections.Generic;
using RoyaleClash.Core;

namespace RoyaleClash.Backend
{
    public enum ClanRole
    {
        Member,
        Elder,
        CoLeader,
        Leader,
    }

    [Serializable]
    public struct ClanMemberInfo
    {
        public PlayerAccountId AccountId;
        public string DisplayName;
        public ClanRole Role;
        public int DonationsThisWeek;
        public int Trophies;
    }

    [Serializable]
    public class ClanInfo
    {
        public string ClanId;
        public string Name;
        public string Description;
        public int TotalTrophies;
        public List<ClanMemberInfo> Members = new List<ClanMemberInfo>();
    }
}
