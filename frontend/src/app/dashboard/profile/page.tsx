"use client";

import { useEffect, useState } from "react";

import { apiRequest } from "@/lib/api";
import { usePreferencesStore } from "@/store/preferences";
import { Card, CardTitle } from "@/components/ui/card";
import type { User } from "@/types";

export default function ProfilePage(): React.ReactElement {
  const [user, setUser] = useState<User | null>(null);
  const { soundEnabled, setSoundEnabled } = usePreferencesStore();

  useEffect(() => {
    apiRequest<User>("/api/v1/auth/me", { auth: true })
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Account</CardTitle>
        {user ? (
          <div className="space-y-1 text-sm text-gray-300">
            <p>Name: {user.full_name}</p>
            <p>Email: {user.email}</p>
            <p>Plan: {user.subscription_plan}</p>
            <p>Timezone: {user.timezone}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Sign in to view your profile.</p>
        )}
      </Card>

      <Card>
        <CardTitle>Preferences</CardTitle>
        <label className="flex items-center justify-between text-sm text-gray-300">
          Signal sounds
          <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
        </label>
      </Card>
    </div>
  );
}
