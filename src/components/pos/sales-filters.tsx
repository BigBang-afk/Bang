import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SALE_STATUSES, SALE_STATUS_LABELS, PAYMENT_STATUSES } from "@/types/sales";

const PAYMENT_STATUS_LABELS: Record<string, string> = { PAID: "Paid", ON_CREDIT: "On Credit" };

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "NEWEST", label: "Newest" },
  { value: "OLDEST", label: "Oldest" },
  { value: "VALUE_HIGH", label: "Highest value" },
  { value: "VALUE_LOW", label: "Lowest value" },
];

export function SalesFilters({
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
                placeholder="Search invoice number, customer name/phone, or barcode..."
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
            <Button variant="ghost" asChild>
              <Link href={basePath}>Reset</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">
                Date from
              </Label>
              <Input id="dateFrom" name="dateFrom" type="date" defaultValue={values.dateFrom} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateTo" className="text-xs text-muted-foreground">
                Date to
              </Label>
              <Input id="dateTo" name="dateTo" type="date" defaultValue={values.dateTo} />
            </div>
            <FilterSelect
              name="paymentStatus"
              placeholder="Payment status"
              defaultValue={values.paymentStatus}
              options={PAYMENT_STATUSES.map((s) => ({ value: s, label: PAYMENT_STATUS_LABELS[s] }))}
            />
            <FilterSelect
              name="status"
              placeholder="Status"
              defaultValue={values.status}
              options={SALE_STATUSES.map((s) => ({ value: s, label: SALE_STATUS_LABELS[s] }))}
            />
          </div>

          <FilterSelect
            name="sort"
            placeholder="Sort: Newest"
            defaultValue={values.sort}
            options={SORT_OPTIONS}
            className="max-w-xs"
          />
        </form>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  name,
  placeholder,
  defaultValue,
  options,
  className,
}: {
  name: string;
  placeholder: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{placeholder}</Label>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger>
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
