import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await requireUser("/dashboard/settings");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="max-w-2xl">
      <PageHeader title="Settings" description="Manage your profile and account preferences." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileSettingsForm profile={profile} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-border py-2">
            <span className="text-muted-foreground">Email</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Role</span>
            <span className="capitalize">{profile.role}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
