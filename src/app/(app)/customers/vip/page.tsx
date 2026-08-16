import { requirePermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listVipCustomers, getSegmentationConfig } from "@/services/customer-analytics.service";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentCustomerTable } from "@/components/customers/segment-customer-table";

export const metadata = { title: "VIP Customers | Zarghoon Jewellers" };

export default async function VipCustomersPage() {
  await requirePermission(PERMISSIONS.CUSTOMERS_SEGMENTS);

  const [rows, config] = await Promise.all([listVipCustomers(), getSegmentationConfig()]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">VIP Customers</h1>
        <p className="text-sm text-muted-foreground">
          Total lifetime spending at or above {formatCurrency(config.vipThreshold.toString())}. Configurable in
          Settings — earning VIP status here never changes a customer&apos;s Customer Type automatically.
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <SegmentCustomerTable rows={rows} emptyMessage="No customers have reached the VIP spending threshold yet." />
        </CardContent>
      </Card>
    </div>
  );
}
