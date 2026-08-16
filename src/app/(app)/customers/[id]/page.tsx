import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Printer, Download } from "lucide-react";
import { requirePermission, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getCustomerProfile } from "@/services/customer.service";
import { getCustomerLifetimeValue, getCustomerSegments, SEGMENT_LABELS } from "@/services/customer-analytics.service";
import { listSales } from "@/services/sale.service";
import { listLedgerEntriesForCustomer } from "@/services/customer-ledger.service";
import { listCustomerPayments } from "@/services/customer-payment.service";
import { listCustomerNotes } from "@/services/customer-notes.service";
import { getCustomerActivity } from "@/services/customer-activity.service";
import { formatCustomerCode } from "@/lib/customer-code";
import { formatInvoiceNumber } from "@/lib/invoice-number";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { CUSTOMER_TYPE_LABELS } from "@/types/customers";
import { PAYMENT_METHOD_LABELS } from "@/types/sales";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CustomerStatusBadge, CustomerTypeBadge } from "@/components/customers/customer-status-badge";
import { CustomerProfileTabs } from "@/components/customers/customer-profile-tabs";
import { CustomerLedgerTable } from "@/components/customers/customer-ledger-table";
import { SalesTable } from "@/components/pos/sales-table";
import { AddNoteForm } from "@/components/customers/add-note-form";
import { PreferencesForm } from "@/components/customers/preferences-form";
import { RecordPaymentButton } from "@/components/customers/record-payment-button";
import { ArchiveCustomerButton } from "@/components/customers/archive-customer-button";

export const metadata = { title: "Customer Profile | Zarghoon Jewellers" };

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.CUSTOMERS_VIEW);
  const { id } = await params;

  const profile = await getCustomerProfile(id);
  if (!profile) notFound();

  const [canManage, canAddNotes, canViewLedger, canRecordPayment, ltv, segments, sales, ledger, payments, notes, activity] =
    await Promise.all([
      userHasPermission(user, PERMISSIONS.CUSTOMERS_MANAGE),
      userHasPermission(user, PERMISSIONS.CUSTOMERS_NOTES),
      userHasPermission(user, PERMISSIONS.CUSTOMERS_LEDGER),
      userHasPermission(user, PERMISSIONS.CUSTOMERS_PAYMENT),
      getCustomerLifetimeValue(id),
      getCustomerSegments(id),
      listSales({ customerId: id, sort: "NEWEST", pageSize: 50 }),
      listLedgerEntriesForCustomer(id, { pageSize: 50 }),
      listCustomerPayments(id, { pageSize: 50 }),
      listCustomerNotes(id),
      getCustomerActivity(id),
    ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-foreground">{profile.name}</h1>
            <CustomerTypeBadge customerType={profile.customerType} />
            <CustomerStatusBadge status={profile.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {formatCustomerCode(profile.customerCode)} · {profile.phone}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {segments.map((segment) => (
              <Badge key={segment} variant="neutral">
                {SEGMENT_LABELS[segment]}
              </Badge>
            ))}
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/customers/${profile.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
            <ArchiveCustomerButton customerId={profile.id} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryCard label="Total Purchases" value={String(ltv.purchaseCount)} />
        <SummaryCard label="Total Spending" value={formatCurrency(ltv.totalSpending)} highlight />
        <SummaryCard
          label="Outstanding Balance"
          value={formatCurrency(profile.outstandingBalance.toString())}
          warn={Number(profile.outstandingBalance) > 0}
        />
        <SummaryCard label="Average Purchase" value={formatCurrency(ltv.averagePurchaseValue)} />
        <SummaryCard label="Last Purchase" value={ltv.lastPurchaseAt ? formatDate(ltv.lastPurchaseAt) : "—"} />
        <SummaryCard label="Customer Since" value={formatDate(profile.createdAt)} />
      </div>

      <CustomerProfileTabs
        overview={
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contact</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm">
                <Row label="Phone" value={profile.phone} />
                <Row label="Secondary Phone" value={profile.secondaryPhone ?? "—"} />
                <Row label="Email" value={profile.email ?? "—"} />
                <Row label="Address" value={profile.address ?? "—"} />
                <Row label="City" value={profile.city ?? "—"} />
                <Row label="Preferred Language" value={profile.preferredLanguage ?? "—"} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Personal</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm">
                <Row label="Date of Birth" value={profile.dateOfBirth ? formatDate(profile.dateOfBirth) : "—"} />
                <Row
                  label="Anniversary"
                  value={profile.anniversaryDate ? formatDate(profile.anniversaryDate) : "—"}
                />
                <Row label="Customer Type" value={CUSTOMER_TYPE_LABELS[profile.customerType]} />
                <Row label="Created By" value={profile.createdBy.name} />
                <Row label="Notes" value={profile.notes ?? "—"} />
              </CardContent>
            </Card>
          </div>
        }
        purchases={
          <Card>
            <CardContent className="p-0">
              <SalesTable rows={sales.rows} />
            </CardContent>
          </Card>
        }
        invoices={
          <Card>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {sales.rows.filter((s) => s.invoice).length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No invoices yet.</p>
              ) : (
                sales.rows
                  .filter((s) => s.invoice)
                  .map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between p-4 text-sm">
                      <div>
                        <p className="font-mono font-medium text-foreground">
                          {formatInvoiceNumber(sale.invoice!.sequence)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(sale.invoice!.generatedAt)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gold">{formatCurrency(sale.grandTotal.toString())}</span>
                        <Button variant="ghost" size="icon" asChild title="Print invoice">
                          <Link href={`/pos/sales/${sale.id}/invoice`}>
                            <Printer className="size-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild title="Download PDF">
                          <Link href={`/api/invoices/${sale.id}/pdf`}>
                            <Download className="size-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
              )}
            </CardContent>
          </Card>
        }
        ledger={
          canViewLedger ? (
            <Card>
              <CardContent className="p-0">
                <CustomerLedgerTable rows={ledger.rows} />
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm text-muted-foreground">You do not have permission to view the ledger.</p>
          )
        }
        payments={
          <div className="flex flex-col gap-4">
            {canRecordPayment && (
              <div>
                <RecordPaymentButton customerId={profile.id} outstandingBalance={profile.outstandingBalance.toString()} />
              </div>
            )}
            <Card>
              <CardContent className="flex flex-col divide-y divide-border p-0">
                {payments.rows.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">No payments recorded yet.</p>
                ) : (
                  payments.rows.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 text-sm">
                      <div>
                        <p className="font-medium text-foreground">{PAYMENT_METHOD_LABELS[payment.method]}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.reference ? `Ref: ${payment.reference} · ` : ""}
                          {formatDateTime(payment.createdAt)} · {payment.createdBy.name}
                        </p>
                      </div>
                      <p className="font-medium text-foreground">{formatCurrency(payment.amount.toString())}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        }
        notes={
          <div className="flex flex-col gap-4">
            {canAddNotes && <AddNoteForm customerId={profile.id} />}
            <div className="flex flex-col gap-3">
              {notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                notes.map((note) => (
                  <Card key={note.id}>
                    <CardContent className="py-3 text-sm">
                      <p className="text-foreground">{note.note}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {note.createdBy.name} · {formatDateTime(note.createdAt)}
                        {note.updatedAt.getTime() !== note.createdAt.getTime() && " (edited)"}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        }
        preferences={
          <PreferencesForm
            customerId={profile.id}
            initial={{
              preferredCategories: profile.preference?.preferredCategories ?? [],
              preferredPurity: profile.preference?.preferredPurity ?? null,
              preferredMetal: profile.preference?.preferredMetal ?? "",
              preferredPriceRangeMin: profile.preference?.preferredPriceRangeMin?.toString() ?? "",
              preferredPriceRangeMax: profile.preference?.preferredPriceRangeMax?.toString() ?? "",
              preferredContactMethod: profile.preference?.preferredContactMethod ?? "",
              notes: profile.preference?.notes ?? "",
            }}
          />
        }
        activity={
          <Card>
            <CardContent className="flex flex-col divide-y divide-border p-0">
              {activity.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No activity yet.</p>
              ) : (
                activity.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 text-sm">
                    <span className="text-foreground">{formatActivityAction(entry.action)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                      {entry.staff ? ` · ${entry.staff.name}` : ""}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        }
      />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p
          className={`mt-1.5 truncate text-lg font-semibold ${
            warn ? "text-warning" : highlight ? "text-gold" : "text-foreground"
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-foreground">{value}</span>
    </div>
  );
}

function formatActivityAction(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}
