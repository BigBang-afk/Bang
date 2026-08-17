"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function KarigarProfileTabs({
  overview,
  goldLedger,
  cashLedger,
  jobs,
  transactions,
  notes,
}: {
  overview: React.ReactNode;
  goldLedger: React.ReactNode;
  cashLedger: React.ReactNode;
  jobs: React.ReactNode;
  transactions: React.ReactNode;
  notes: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="goldLedger">Gold Ledger</TabsTrigger>
        <TabsTrigger value="cashLedger">Cash Ledger</TabsTrigger>
        <TabsTrigger value="jobs">Jobs</TabsTrigger>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="goldLedger">{goldLedger}</TabsContent>
      <TabsContent value="cashLedger">{cashLedger}</TabsContent>
      <TabsContent value="jobs">{jobs}</TabsContent>
      <TabsContent value="transactions">{transactions}</TabsContent>
      <TabsContent value="notes">{notes}</TabsContent>
    </Tabs>
  );
}
