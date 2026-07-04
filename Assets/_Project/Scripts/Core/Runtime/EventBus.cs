using System;
using System.Collections.Generic;

namespace RoyaleClash.Core
{
    /// <summary>
    /// Lightweight typed pub/sub so systems (e.g. UI) can react to gameplay events
    /// (e.g. Economy granting currency, Battle ending) without a direct reference
    /// to the system that raised them.
    /// </summary>
    public static class EventBus
    {
        private static readonly Dictionary<Type, Delegate> Handlers = new Dictionary<Type, Delegate>();

        public static void Subscribe<TEvent>(Action<TEvent> handler)
        {
            Handlers.TryGetValue(typeof(TEvent), out Delegate existing);
            Handlers[typeof(TEvent)] = existing == null ? handler : Delegate.Combine(existing, handler);
        }

        public static void Unsubscribe<TEvent>(Action<TEvent> handler)
        {
            if (!Handlers.TryGetValue(typeof(TEvent), out Delegate existing))
                return;

            Delegate remaining = Delegate.Remove(existing, handler);
            if (remaining == null)
                Handlers.Remove(typeof(TEvent));
            else
                Handlers[typeof(TEvent)] = remaining;
        }

        public static void Publish<TEvent>(TEvent evt)
        {
            if (Handlers.TryGetValue(typeof(TEvent), out Delegate existing))
                ((Action<TEvent>)existing)?.Invoke(evt);
        }

        public static void Clear() => Handlers.Clear();
    }
}
