"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateNotificationSettingsAction } from "@/lib/actions/account";
import type { UserSettingsRow } from "@/types/database";

export function NotificationSettingsForm({ settings }: { settings: UserSettingsRow }) {
  const [emailNotifications, setEmailNotifications] = useState(
    settings.email_notifications
  );
  const [marketingEmails, setMarketingEmails] = useState(settings.marketing_emails);

  return (
    <form action={updateNotificationSettingsAction} className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="emailNotifications">Product email notifications</Label>
          <p className="text-xs text-muted-foreground">
            Alerts, setup updates and account activity.
          </p>
        </div>
        <Switch
          id="emailNotifications"
          name="emailNotifications"
          checked={emailNotifications}
          onCheckedChange={setEmailNotifications}
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="marketingEmails">Marketing emails</Label>
          <p className="text-xs text-muted-foreground">
            Product updates, tips and occasional offers.
          </p>
        </div>
        <Switch
          id="marketingEmails"
          name="marketingEmails"
          checked={marketingEmails}
          onCheckedChange={setMarketingEmails}
        />
      </div>

      <Button type="submit" variant="outline" size="sm">
        Save preferences
      </Button>
    </form>
  );
}
