using System;
using System.Collections.Generic;

namespace RoyaleClash.Core
{
    /// <summary>
    /// Minimal service registry so cross-cutting systems (Backend, Economy, Audio)
    /// can find each other without static singletons scattered across the codebase.
    /// Registered once at boot (see Boot scene) and cleared between play sessions
    /// in the Editor to avoid stale references on domain reload.
    /// </summary>
    public static class ServiceLocator
    {
        private static readonly Dictionary<Type, object> Services = new Dictionary<Type, object>();

        public static void Register<T>(T service) where T : class
        {
            Services[typeof(T)] = service ?? throw new ArgumentNullException(nameof(service));
        }

        public static bool TryGet<T>(out T service) where T : class
        {
            if (Services.TryGetValue(typeof(T), out object value))
            {
                service = (T)value;
                return true;
            }
            service = null;
            return false;
        }

        public static T Get<T>() where T : class
        {
            if (TryGet(out T service))
                return service;
            throw new InvalidOperationException($"Service of type {typeof(T).Name} is not registered.");
        }

        public static void Unregister<T>() where T : class => Services.Remove(typeof(T));

        public static void Clear() => Services.Clear();
    }
}
