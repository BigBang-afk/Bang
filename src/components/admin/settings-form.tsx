"use client";

import { useActionState, useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { WebsiteSettings } from "@/types/database";
import { updateWebsiteSettingsAction, type ActionState } from "@/app/admin/(protected)/settings/actions";

export function SettingsForm({ settings }: { settings: WebsiteSettings }) {
  const [state, formAction, isPending] = useActionState(updateWebsiteSettingsAction, {} as ActionState);
  useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success(state.success);
  }, [state.error, state.success]);

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-8">
      <section className="rounded-sm border border-charcoal/10 bg-white p-5">
        <h2 className="mb-4 font-serif text-lg">Business Information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><Label htmlFor="business_name" required>Business Name</Label><Input id="business_name" name="business_name" required defaultValue={settings.business_name} /></div>
          <div><Label htmlFor="tagline">Tagline</Label><Input id="tagline" name="tagline" defaultValue={settings.tagline} /></div>
          <div><Label htmlFor="phone_number" required>Phone Number</Label><Input id="phone_number" name="phone_number" required defaultValue={settings.phone_number} /></div>
          <div><Label htmlFor="whatsapp_number" required>WhatsApp Number</Label><Input id="whatsapp_number" name="whatsapp_number" required defaultValue={settings.whatsapp_number} placeholder="92300XXXXXXX" /></div>
          <div><Label htmlFor="email" required>Email</Label><Input id="email" name="email" type="email" required defaultValue={settings.email} /></div>
          <div><Label htmlFor="address_line1" required>Address Line 1</Label><Input id="address_line1" name="address_line1" required defaultValue={settings.address_line1} /></div>
          <div><Label htmlFor="address_line2" required>Address Line 2</Label><Input id="address_line2" name="address_line2" required defaultValue={settings.address_line2} /></div>
          <div><Label htmlFor="google_maps_link">Google Maps Link</Label><Input id="google_maps_link" name="google_maps_link" defaultValue={settings.google_maps_link ?? ""} /></div>
        </div>
        <div className="mt-4"><Label htmlFor="google_maps_embed_url">Google Maps Embed URL</Label><Textarea id="google_maps_embed_url" name="google_maps_embed_url" rows={2} defaultValue={settings.google_maps_embed_url ?? ""} placeholder="https://www.google.com/maps/embed?..." /></div>
      </section>

      <section className="rounded-sm border border-charcoal/10 bg-white p-5">
        <h2 className="mb-4 font-serif text-lg">Branding</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="logo_file">Logo</Label>
            {settings.logo_url && <Image src={settings.logo_url} alt="" width={48} height={48} className="mb-2 h-12 w-12 object-contain" />}
            <input id="logo_file" name="logo_file" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-xs" />
          </div>
          <div>
            <Label htmlFor="favicon_file">Favicon</Label>
            {settings.favicon_url && <Image src={settings.favicon_url} alt="" width={32} height={32} className="mb-2 h-8 w-8 object-contain" />}
            <input id="favicon_file" name="favicon_file" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-xs" />
          </div>
          <div>
            <Label htmlFor="hero_image_file">Homepage Hero Image</Label>
            {settings.hero_image_url && <Image src={settings.hero_image_url} alt="" width={64} height={40} className="mb-2 h-10 w-16 object-cover" />}
            <input id="hero_image_file" name="hero_image_file" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-xs" />
          </div>
        </div>
      </section>

      <section className="rounded-sm border border-charcoal/10 bg-white p-5">
        <h2 className="mb-4 font-serif text-lg">Homepage Hero</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="hero_heading" required>Heading</Label><Input id="hero_heading" name="hero_heading" required defaultValue={settings.hero_heading} /></div>
          <div><Label htmlFor="hero_subheading">Subheading</Label><Input id="hero_subheading" name="hero_subheading" defaultValue={settings.hero_subheading} /></div>
          <div className="sm:col-span-2"><Label htmlFor="hero_description">Description</Label><Textarea id="hero_description" name="hero_description" rows={2} defaultValue={settings.hero_description} /></div>
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className="contents">
              <div><Label htmlFor={`hero_cta_${n}_text`}>{`Button ${n} Text`}</Label><Input id={`hero_cta_${n}_text`} name={`hero_cta_${n}_text`} defaultValue={settings[`hero_cta_${n}_text` as keyof WebsiteSettings] as string} /></div>
              <div><Label htmlFor={`hero_cta_${n}_url`}>{`Button ${n} URL`}</Label><Input id={`hero_cta_${n}_url`} name={`hero_cta_${n}_url`} defaultValue={settings[`hero_cta_${n}_url` as keyof WebsiteSettings] as string} /></div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-sm border border-charcoal/10 bg-white p-5">
        <h2 className="mb-4 font-serif text-lg">Disclaimers &amp; Custom Order Info</h2>
        <div className="space-y-4">
          <div><Label htmlFor="gold_rate_disclaimer" required>Gold Rate Disclaimer</Label><Textarea id="gold_rate_disclaimer" name="gold_rate_disclaimer" required rows={2} defaultValue={settings.gold_rate_disclaimer} /></div>
          <div><Label htmlFor="product_price_disclaimer" required>Product Price Disclaimer</Label><Textarea id="product_price_disclaimer" name="product_price_disclaimer" required rows={2} defaultValue={settings.product_price_disclaimer} /></div>
          <div><Label htmlFor="custom_order_info">Custom Order Info</Label><Textarea id="custom_order_info" name="custom_order_info" rows={2} defaultValue={settings.custom_order_info} /></div>
          <div><Label htmlFor="footer_about" required>Footer About Text</Label><Textarea id="footer_about" name="footer_about" required rows={2} defaultValue={settings.footer_about} /></div>
        </div>
      </section>

      <section className="rounded-sm border border-charcoal/10 bg-white p-5">
        <h2 className="mb-4 font-serif text-lg">SEO Settings</h2>
        <div className="space-y-4">
          <div><Label htmlFor="seo_default_title" required>Default SEO Title</Label><Input id="seo_default_title" name="seo_default_title" required maxLength={70} defaultValue={settings.seo_default_title} /></div>
          <div><Label htmlFor="seo_default_description" required>Default SEO Description</Label><Textarea id="seo_default_description" name="seo_default_description" required maxLength={160} rows={2} defaultValue={settings.seo_default_description} /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label htmlFor="google_analytics_id">Google Analytics ID</Label><Input id="google_analytics_id" name="google_analytics_id" defaultValue={settings.google_analytics_id ?? ""} placeholder="G-XXXXXXXXXX" /></div>
            <div><Label htmlFor="google_search_console_verification">Search Console Verification</Label><Input id="google_search_console_verification" name="google_search_console_verification" defaultValue={settings.google_search_console_verification ?? ""} /></div>
          </div>
        </div>
      </section>

      <section className="rounded-sm border border-charcoal/10 bg-white p-5">
        <h2 className="mb-4 font-serif text-lg">Gold Rate API (Future Integration)</h2>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input type="checkbox" name="gold_rate_api_enabled" defaultChecked={settings.gold_rate_api_enabled} /> Enable automatic API rate updates (when configured)
        </label>
        <Label htmlFor="gold_rate_api_url">API URL</Label>
        <Input id="gold_rate_api_url" name="gold_rate_api_url" defaultValue={settings.gold_rate_api_url ?? ""} placeholder="https://api.example.com/gold-rate" />
        <p className="mt-2 text-xs text-charcoal/50">Manual rates in Gold Rate Management always override API rates whenever manual override is enabled per purity.</p>
      </section>

      {state.error && <p role="alert" className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}

      <Button type="submit" variant="gold" size="lg" disabled={isPending}>{isPending ? "Saving…" : "Save Settings"}</Button>
    </form>
  );
}
