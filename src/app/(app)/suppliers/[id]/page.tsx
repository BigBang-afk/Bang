import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requirePermission, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getSupplierById, getSupplierPurchaseSummary } from "@/services/supplier.service";
import { getPartyGoldPosition } from "@/services/gold-ledger.service";
import { getPartyCashPosition, listPartyCashLedgerEntries } from "@/services/party-cash-ledger.service";
import { listPurchases } from "@/services/purchase.service";
import { listPurchasePaymentsForSupplier } from "@/services/supplier-payment.service";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SupplierStatusSelect } from "@/components/suppliers/supplier-status-select";
import { GoldPositionList } from "@/components/ledger/gold-position";
import { CashPositionDisplay } from "@/components/ledger/cash-position";
import { SupplierPaymentDialog } from "@/components/suppliers/supplier-payment-dialog";
import { SupplierProfileTabs } from "@/components/suppliers/supplier-profile-tabs";
import { SupplierPurchasesTable } from "@/components/suppliers/supplier-purchases-table";
import { PartyCashLedgerTable } from "@/components/karigars/karigar-cash-ledger-table";

export const metadata = { title: "Supplier Profile | Zarghoon Jewellers" };

export default async function SupplierProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.SUPPLIERS_VIEW);
  const { id } = await params;

  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  const canManage = await userHasPermission(user, PERMISSIONS.SUPPLIERS_MANAGE);
  const canPay = await userHasPermission(user, PERMISSIONS.CASH_MANAGE);

  const [purchaseSummary, goldPositions, cashPosition, purchases, cashLedger, payments] = await Promise.all([
    getSupplierPurchaseSummary(id),
    getPartyGoldPosition("SUPPLIER", id),
    getPartyCashPosition("SUPPLIER", id),
    listPurchases({ supplierId: id, pageSize: 50 }),
    listPartyCashLedgerEntries("SUPPLIER", id, { pageSize: 50 }),
    listPurchasePaymentsForSupplier(id, { pageSize: 50 }),
  ]);

  const overview = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-foreground">{supplier.phone}</p>
          {supplier.companyName && <p className="text-muted-foreground">{supplier.companyName}</p>}
          {supplier.email && <p className="text-muted-foreground">{supplier.email}</p>}
          {supplier.city && <p className="text-muted-foreground">{supplier.city}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Purchases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-foreground">Total Purchases: {formatCurrency(purchaseSummary.totalPurchases)}</p>
          <p className="text-foreground">Amount Paid: {formatCurrency(purchaseSummary.amountPaid)}</p>
          <p className="text-muted-foreground">
            Last Purchase: {purchaseSummary.lastPurchaseAt ? formatDate(purchaseSummary.lastPurchaseAt) : "None yet"}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const purchasesContent = <SupplierPurchasesTable rows={purchases.rows} />;
  const ledgerContent = <PartyCashLedgerTable rows={cashLedger.rows} />;
  const goldContent = (
    <div className="max-w-md">
      <GoldPositionList positions={goldPositions} />
    </div>
  );
  const paymentsContent =
    payments.rows.length === 0 ? (
      <p className="px-4 py-10 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Reference</TableHead>
            <TableHead>By</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(row.createdAt)}</TableCell>
              <TableCell className="font-medium text-success">{formatCurrency(row.amount)}</TableCell>
              <TableCell className="text-muted-foreground">{row.method.replace("_", " ")}</TableCell>
              <TableCell className="text-muted-foreground">{row.reference ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{row.createdBy.name}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  const notesContent = (
    <p className="px-1 py-4 text-sm text-muted-foreground">{supplier.notes || "No notes on record."}</p>
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">{supplier.name}</h1>
          <p className="text-sm text-muted-foreground">
            {supplier.supplierCode} · {supplier.phone}
            {supplier.companyName ? ` · ${supplier.companyName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && <SupplierStatusSelect supplierId={supplier.id} status={supplier.status} />}
          {canManage && (
            <Button variant="outline" asChild>
              <Link href={`/suppliers/${supplier.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          )}
          {canPay && <SupplierPaymentDialog supplierId={supplier.id} payable={cashPosition.payable} />}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gold Position</CardTitle>
          </CardHeader>
          <CardContent>
            <GoldPositionList positions={goldPositions} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cash Position</CardTitle>
          </CardHeader>
          <CardContent>
            <CashPositionDisplay payable={cashPosition.payable} receivable={cashPosition.receivable} />
          </CardContent>
        </Card>
      </div>

      <SupplierProfileTabs
        overview={overview}
        purchases={purchasesContent}
        ledger={ledgerContent}
        gold={goldContent}
        payments={paymentsContent}
        notes={notesContent}
      />
    </div>
  );
}
