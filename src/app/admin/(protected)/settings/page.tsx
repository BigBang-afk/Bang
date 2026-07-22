import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { BusinessHoursForm } from "@/components/admin/business-hours-form";
import { SocialLinksManager } from "@/components/admin/social-links-manager";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { getWebsiteSettings, getBusinessHours, getSocialLinks } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Website Settings" };

export default async function SettingsPage() {
  const [settings, hours, socialLinks] = await Promise.all([
    getWebsiteSettings(),
    getBusinessHours(),
    getSocialLinks(false),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-charcoal">Website Settings</h1>
        <p className="text-sm text-charcoal/60">Business information, homepage content, disclaimers, and SEO — all editable here instead of hardcoded in the code.</p>
      </div>

      <SettingsForm settings={settings} />

      <Card>
        <CardHeader><h2 className="font-serif text-lg">Business Hours</h2></CardHeader>
        <CardBody><BusinessHoursForm hours={hours} /></CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-serif text-lg">Social Media Links</h2></CardHeader>
        <CardBody><SocialLinksManager links={socialLinks} /></CardBody>
      </Card>
    </div>
  );
}
