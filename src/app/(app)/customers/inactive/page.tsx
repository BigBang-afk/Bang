import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listInactiveCustomers, getSegmentationConfig } from "@/services/customer-analytics.service";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentCustomerTable } from "@/components/customers/segment-customer-table";

export const metadata = { title: "Inactive Customers | Zarghoon Jewellers" };

export default async function InactiveCustomersPage() {
  await requirePermission(PERMISSIONS.CUSTOMERS_SEGMENTS);

  const [rows, config] = await Promise.all([listInactiveCustomers(), getSegmentationConfig()]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Inactive Customers</h1>
        <p className="text-sm text-muted-foreground">
          No completed purchase in the last {config.inactivityDays} days. This is a marketing segment only —
          it never changes a customer&apos;s account status.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <SegmentCustomerTable rows={rows} emptyMessage="No customers are currently inactive." />
        </CardContent>
      </Card>
    </div>
  );
}
