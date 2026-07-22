import type { Metadata } from "next";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Download } from "lucide-react";

export const metadata: Metadata = { title: "Backup & Export" };

const EXPORTS = [
  { href: "/api/admin/export/products", label: "All Products (CSV)" },
  { href: "/api/admin/export/inquiries", label: "Customer Inquiries (CSV)" },
  { href: "/api/admin/export/custom-orders", label: "Custom Orders (CSV)" },
  { href: "/api/admin/export/gold-rate-history?purity=24K", label: "Gold Rate History — 24K (CSV)" },
  { href: "/api/admin/export/gold-rate-history?purity=22K", label: "Gold Rate History — 22K (CSV)" },
  { href: "/api/admin/export/gold-rate-history?purity=21K", label: "Gold Rate History — 21K (CSV)" },
  { href: "/api/admin/export/gold-rate-history?purity=18K", label: "Gold Rate History — 18K (CSV)" },
];

export default function BackupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-charcoal">Backup &amp; Export</h1>
        <p className="text-sm text-charcoal/60">Export data as CSV, and follow the checklist below for full database and image backups.</p>
      </div>

      <Card>
        <CardHeader><h2 className="font-serif text-lg">Data Exports</h2></CardHeader>
        <CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {EXPORTS.map((e) => (
            <a key={e.href} href={e.href} className="flex items-center justify-between rounded-sm border border-charcoal/10 px-4 py-3 text-sm hover:bg-ivory-dark/50">
              {e.label} <Download size={16} className="text-charcoal/40" />
            </a>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-serif text-lg">Full Database &amp; Image Backup Checklist</h2></CardHeader>
        <CardBody>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-charcoal/70">
            <li>In the Supabase Dashboard, go to <strong>Database → Backups</strong> — Supabase takes automatic daily backups on paid plans; on the Free plan, take periodic manual backups via <code className="rounded bg-ivory-dark px-1">pg_dump</code>.</li>
            <li>Run a manual backup locally: <code className="rounded bg-ivory-dark px-1">supabase db dump --db-url &lt;connection-string&gt; -f backup.sql</code>.</li>
            <li>Export the CSVs above regularly (products, inquiries, custom orders, gold rate history) and store them off-platform (e.g. Google Drive).</li>
            <li>Product/category/banner/testimonial images live in Supabase Storage bucket <code className="rounded bg-ivory-dark px-1">zarghoon-media</code> — download via the Supabase Storage dashboard or CLI (<code className="rounded bg-ivory-dark px-1">supabase storage</code>) periodically.</li>
            <li>Keep a secure copy of your <code className="rounded bg-ivory-dark px-1">.env.local</code> environment variables (excluding secrets from version control) in a password manager.</li>
            <li>To restore: create a fresh Supabase project, run the SQL migrations in <code className="rounded bg-ivory-dark px-1">supabase/migrations</code>, then restore data via <code className="rounded bg-ivory-dark px-1">psql</code> from your <code className="rounded bg-ivory-dark px-1">backup.sql</code>, and re-upload images to Storage.</li>
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}
