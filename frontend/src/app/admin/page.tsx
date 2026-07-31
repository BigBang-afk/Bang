"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import type { Strategy } from "@/types";

interface Dashboard {
  total_users: number;
  active_users: number;
  total_signals: number;
  signals_today: number;
  win_rate: number;
  signal_engine_paused: boolean;
  active_provider: string;
  provider_connected: boolean;
}

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
  subscription_plan: string;
  is_active: boolean;
}

export default function AdminOverviewPage(): React.ReactElement {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh(): Promise<void> {
    try {
      const [d, s, u] = await Promise.all([
        apiRequest<Dashboard>("/api/v1/admin/dashboard", { auth: true }),
        apiRequest<Strategy[]>("/api/v1/admin/strategies", { auth: true }),
        apiRequest<AdminUser[]>("/api/v1/admin/users", { auth: true }),
      ]);
      setDashboard(d);
      setStrategies(s);
      setUsers(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data. Sign in as an admin.");
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function toggleStrategy(strategy: Strategy): Promise<void> {
    const action = strategy.is_enabled ? "deactivate" : "activate";
    await apiRequest(`/api/v1/admin/strategies/${strategy.id}/${action}`, { method: "POST", auth: true });
    await refresh();
  }

  async function toggleSignalEngine(): Promise<void> {
    if (!dashboard) return;
    const action = dashboard.signal_engine_paused ? "resume" : "pause";
    await apiRequest(`/api/v1/admin/signals/${action}`, { method: "POST", auth: true });
    await refresh();
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-xl font-bold text-gray-100">Admin Overview</h1>

      {dashboard && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <p className="text-xs text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-100">{dashboard.total_users}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">Signals Today</p>
            <p className="text-2xl font-bold text-gray-100">{dashboard.signals_today}</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">Win Rate</p>
            <p className="text-2xl font-bold text-gray-100">{dashboard.win_rate}%</p>
          </Card>
          <Card>
            <p className="text-xs text-gray-500">Provider</p>
            <p className="text-lg font-bold text-gray-100">
              {dashboard.active_provider} <Badge tone={dashboard.provider_connected ? "call" : "put"}>{dashboard.provider_connected ? "UP" : "DOWN"}</Badge>
            </p>
          </Card>
        </div>
      )}

      {dashboard && (
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Signal Engine</CardTitle>
              <p className="text-sm text-gray-300">
                Status: <Badge tone={dashboard.signal_engine_paused ? "warning" : "call"}>{dashboard.signal_engine_paused ? "PAUSED" : "RUNNING"}</Badge>
              </p>
            </div>
            <Button variant={dashboard.signal_engine_paused ? "primary" : "danger"} onClick={toggleSignalEngine}>
              {dashboard.signal_engine_paused ? "Resume" : "Pause"}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <CardTitle>Strategies</CardTitle>
        <ul className="divide-y divide-terminal-border text-sm">
          {strategies.map((s) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <span className="text-gray-200">{s.name}</span>
              <div className="flex items-center gap-2">
                <Badge tone={s.is_enabled ? "call" : "neutral"}>{s.is_enabled ? "Enabled" : "Disabled"}</Badge>
                <Button size="sm" variant="secondary" onClick={() => toggleStrategy(s)}>
                  {s.is_enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Users</CardTitle>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-gray-500">
            <tr>
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Plan</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-terminal-border">
                <td className="py-2">{u.full_name}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.subscription_plan}</td>
                <td>
                  <Badge tone={u.is_active ? "call" : "put"}>{u.is_active ? "Active" : "Disabled"}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </main>
  );
}
