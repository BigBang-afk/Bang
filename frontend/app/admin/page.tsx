"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    api
      .get<User[]>("/admin/users")
      .then(setUsers)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 403) setForbidden(true);
      });
  }, []);

  const toggleActive = async (id: string) => {
    const updated = await api.patch<User>(`/admin/users/${id}/toggle-active`);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
  };

  if (forbidden) {
    return (
      <AppShell title="Admin">
        <p className="text-bear">Admin access required.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin Panel">
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-graphite">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-graphite/50 hover:bg-charcoal/50">
                <td className="px-4 py-3 text-white">{u.email}</td>
                <td className="px-4 py-3 capitalize text-gray-300">{u.role}</td>
                <td className="px-4 py-3 uppercase text-gold text-xs">{u.subscription_tier}</td>
                <td className="px-4 py-3">
                  <span className={u.is_active ? "badge-long" : "badge-short"}>
                    {u.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(u.id)} className="text-xs text-gold hover:underline">
                    {u.is_active ? "Disable" : "Enable"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
