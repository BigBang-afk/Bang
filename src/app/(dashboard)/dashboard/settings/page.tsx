import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { AvatarUpload } from "@/components/dashboard/avatar-upload";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { DeleteAccountDialog } from "@/components/dashboard/delete-account-dialog";
import { NotificationSettingsForm } from "@/components/dashboard/notification-settings-form";
import { ProfileSettingsForm } from "@/components/dashboard/profile-settings-form";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { UserSettingsRow } from "@/types/database";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await requireUser("/dashboard/settings");
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data: userSettings },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("user_settings").select("*").eq("user_id", profile.id).maybeSingle(),
  ]);

  const displayName = profile.display_name || profile.full_name || "Trader";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const settings: UserSettingsRow =
    userSettings ?? {
      user_id: profile.id,
      email_notifications: true,
      marketing_emails: false,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Manage your profile and account preferences." />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <AvatarUpload
            userId={profile.id}
            initials={initials}
            avatarUrl={profile.avatar_url}
          />
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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <NotificationSettingsForm settings={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-sm text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This cannot be
            undone.
          </p>
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}
