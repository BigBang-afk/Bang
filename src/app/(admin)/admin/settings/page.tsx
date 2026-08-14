import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth/session";
import { siteConfig, supportedMarkets } from "@/lib/config/site";

export const metadata: Metadata = { title: "Platform Settings" };

export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Platform settings"
        description="Read-only for Phase 1. Editable platform configuration lands alongside the settings it controls."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-border py-2">
            <span className="text-muted-foreground">Product name</span>
            <span>{siteConfig.name}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border py-2">
            <span className="text-muted-foreground">Support email</span>
            <span>{siteConfig.supportEmail}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Supported markets</span>
            <span>{supportedMarkets.map((m) => m.label).join(", ")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
