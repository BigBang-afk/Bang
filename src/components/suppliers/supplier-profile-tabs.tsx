"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function SupplierProfileTabs({
  overview,
  purchases,
  ledger,
  gold,
  payments,
  notes,
}: {
  overview: React.ReactNode;
  purchases: React.ReactNode;
  ledger: React.ReactNode;
  gold: React.ReactNode;
  payments: React.ReactNode;
  notes: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="purchases">Purchases</TabsTrigger>
        <TabsTrigger value="ledger">Ledger</TabsTrigger>
        <TabsTrigger value="gold">Gold</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="purchases">{purchases}</TabsContent>
      <TabsContent value="ledger">{ledger}</TabsContent>
      <TabsContent value="gold">{gold}</TabsContent>
      <TabsContent value="payments">{payments}</TabsContent>
      <TabsContent value="notes">{notes}</TabsContent>
    </Tabs>
  );
}
