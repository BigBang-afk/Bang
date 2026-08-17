import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SORT_OPTIONS = [
  { value: "NEWEST", label: "Newest" },
  { value: "OLDEST", label: "Oldest" },
  { value: "AMOUNT_HIGH", label: "Highest amount" },
  { value: "BALANCE_HIGH", label: "Highest balance" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIALLY_PAID", label: "Partially paid" },
  { value: "PAID", label: "Paid" },
];

export function PurchaseFilters({
  values,
  basePath,
}: {
  values: Record<string, string | undefined>;
  basePath: string;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <form method="GET" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="search"
                defaultValue={values.search}
                placeholder="Search purchase number, supplier, or reference..."
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
            <Button variant="ghost" asChild>
              <Link href={basePath}>Reset</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Payment Status</Label>
              <Select name="paymentStatus" defaultValue={values.paymentStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input id="dateFrom" name="dateFrom" type="date" defaultValue={values.dateFrom} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input id="dateTo" name="dateTo" type="date" defaultValue={values.dateTo} />
            </div>
            <div className="space-y-1 sm:col-span-3">
              <Label className="text-xs text-muted-foreground">Sort</Label>
              <Select name="sort" defaultValue={values.sort}>
                <SelectTrigger className="sm:w-48">
                  <SelectValue placeholder="Newest" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
