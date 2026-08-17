"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function CustomerProfileTabs({
  overview,
  purchases,
  invoices,
  ledger,
  payments,
  notes,
  preferences,
  activity,
}: {
  overview: React.ReactNode;
  purchases: React.ReactNode;
  invoices: React.ReactNode;
  ledger: React.ReactNode;
  payments: React.ReactNode;
  notes: React.ReactNode;
  preferences: React.ReactNode;
  activity: React.ReactNode;
}) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="purchases">Purchases</TabsTrigger>
        <TabsTrigger value="invoices">Invoices</TabsTrigger>
        <TabsTrigger value="ledger">Ledger</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="preferences">Preferences</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{overview}</TabsContent>
      <TabsContent value="purchases">{purchases}</TabsContent>
      <TabsContent value="invoices">{invoices}</TabsContent>
      <TabsContent value="ledger">{ledger}</TabsContent>
      <TabsContent value="payments">{payments}</TabsContent>
      <TabsContent value="notes">{notes}</TabsContent>
      <TabsContent value="preferences">{preferences}</TabsContent>
      <TabsContent value="activity">{activity}</TabsContent>
    </Tabs>
  );
}
