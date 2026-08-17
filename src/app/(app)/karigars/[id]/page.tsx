import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { requirePermission, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { getKarigarById } from "@/services/karigar.service";
import { getPartyGoldPosition, listGoldLedgerEntriesForParty } from "@/services/gold-ledger.service";
import { getPartyCashPosition, listPartyCashLedgerEntries } from "@/services/party-cash-ledger.service";
import { listKarigarGoldJobs } from "@/services/karigar-job.service";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KarigarSpecializationBadge } from "@/components/karigars/karigar-status-badge";
import { KarigarStatusSelect } from "@/components/karigars/karigar-status-select";
import { GoldPositionList } from "@/components/ledger/gold-position";
import { CashPositionDisplay } from "@/components/ledger/cash-position";
import { GiveGoldDialog } from "@/components/karigars/give-gold-dialog";
import { KarigarCashDialog } from "@/components/karigars/karigar-cash-dialog";
import { KarigarProfileTabs } from "@/components/karigars/karigar-profile-tabs";
import { KarigarGoldLedgerTable } from "@/components/karigars/karigar-gold-ledger-table";
import { PartyCashLedgerTable } from "@/components/karigars/karigar-cash-ledger-table";
import { KarigarJobsTable } from "@/components/karigars/karigar-jobs-table";

export const metadata = { title: "Karigar Profile | Zarghoon Jewellers" };

export default async function KarigarProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(PERMISSIONS.KARIGARS_VIEW);
  const { id } = await params;

  const karigar = await getKarigarById(id);
  if (!karigar) notFound();

  const canManage = await userHasPermission(user, PERMISSIONS.KARIGARS_MANAGE);
  const canGold = await userHasPermission(user, PERMISSIONS.KARIGARS_GOLD);
  const canCash = await userHasPermission(user, PERMISSIONS.KARIGARS_CASH);

  const [goldPositions, cashPosition, goldLedger, cashLedger, jobs] = await Promise.all([
    getPartyGoldPosition("KARIGAR", id),
    getPartyCashPosition("KARIGAR", id),
    listGoldLedgerEntriesForParty("KARIGAR", id, { pageSize: 50 }),
    listPartyCashLedgerEntries("KARIGAR", id, { pageSize: 50 }),
    listKarigarGoldJobs(id, { pageSize: 50 }),
  ]);

  const jobsCompleted = jobs.rows.filter((j) => j.receivedWeight !== null).length;
  const lastGoldAt = goldLedger.rows[0]?.createdAt ?? null;
  const lastCashAt = cashLedger.rows[0]?.createdAt ?? null;
  const lastTransactionAt =
    lastGoldAt && lastCashAt ? (lastGoldAt > lastCashAt ? lastGoldAt : lastCashAt) : lastGoldAt ?? lastCashAt;

  const overview = (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-foreground">{karigar.phone}</p>
          {karigar.secondaryPhone && <p className="text-muted-foreground">{karigar.secondaryPhone}</p>}
          {karigar.city && <p className="text-muted-foreground">{karigar.city}</p>}
          {karigar.address && <p className="text-muted-foreground">{karigar.address}</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p className="text-foreground">Jobs Completed: {jobsCompleted}</p>
          <p className="text-foreground">Open Jobs: {jobs.rows.filter((j) => j.receivedWeight === null).length}</p>
          <p className="text-muted-foreground">
            Last Transaction: {lastTransactionAt ? formatDate(lastTransactionAt) : "None yet"}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const goldLedgerContent = <KarigarGoldLedgerTable rows={goldLedger.rows} />;
  const cashLedgerContent = <PartyCashLedgerTable rows={cashLedger.rows} />;
  const jobsContent = <KarigarJobsTable rows={jobs.rows} />;
  const transactionsContent = (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Gold Transactions</h3>
        <KarigarGoldLedgerTable rows={goldLedger.rows} />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Cash Transactions</h3>
        <PartyCashLedgerTable rows={cashLedger.rows} />
      </div>
    </div>
  );
  const notesContent = (
    <p className="px-1 py-4 text-sm text-muted-foreground">{karigar.notes || "No notes on record."}</p>
  );

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-foreground">{karigar.name}</h1>
            <KarigarSpecializationBadge specialization={karigar.specialization} />
          </div>
          <p className="text-sm text-muted-foreground">
            {karigar.karigarCode} · {karigar.phone}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && <KarigarStatusSelect karigarId={karigar.id} status={karigar.status} />}
          {canManage && (
            <Button variant="outline" asChild>
              <Link href={`/karigars/${karigar.id}/edit`}>
                <Pencil className="size-4" />
                Edit
              </Link>
            </Button>
          )}
          {canGold && <GiveGoldDialog karigarId={karigar.id} />}
          {canCash && <KarigarCashDialog karigarId={karigar.id} />}
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

      <KarigarProfileTabs
        overview={overview}
        goldLedger={goldLedgerContent}
        cashLedger={cashLedgerContent}
        jobs={jobsContent}
        transactions={transactionsContent}
        notes={notesContent}
      />
    </div>
  );
}
