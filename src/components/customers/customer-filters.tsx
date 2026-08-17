import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CUSTOMER_TYPES, CUSTOMER_TYPE_LABELS, CUSTOMER_STATUSES, CUSTOMER_STATUS_LABELS } from "@/types/customers";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "NEWEST", label: "Newest" },
  { value: "OLDEST", label: "Oldest" },
  { value: "SPENDING_HIGH", label: "Highest spending" },
  { value: "OUTSTANDING_HIGH", label: "Highest outstanding" },
  { value: "MOST_PURCHASES", label: "Most purchases" },
  { value: "RECENT_PURCHASE", label: "Recently purchased" },
];

export function CustomerFilters({
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
                placeholder="Search name, phone, customer code, or email..."
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
            <Button variant="ghost" asChild>
              <Link href={basePath}>Reset</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FilterSelect
              name="customerType"
              placeholder="Customer type"
              defaultValue={values.customerType}
              options={CUSTOMER_TYPES.map((t) => ({ value: t, label: CUSTOMER_TYPE_LABELS[t] }))}
            />
            <FilterSelect
              name="status"
              placeholder="Status"
              defaultValue={values.status}
              options={CUSTOMER_STATUSES.map((s) => ({ value: s, label: CUSTOMER_STATUS_LABELS[s] }))}
            />
            <div className="space-y-1">
              <Label htmlFor="city" className="text-xs text-muted-foreground">
                City
              </Label>
              <Input id="city" name="city" defaultValue={values.city} placeholder="Any" />
            </div>
            <FilterSelect
              name="sort"
              placeholder="Sort: Newest"
              defaultValue={values.sort}
              options={SORT_OPTIONS}
            />
          </div>

          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
              More filters (spending, outstanding balance, last purchase)
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <RangeField label="Min spending" name="minSpending" defaultValue={values.minSpending} />
              <RangeField label="Max spending" name="maxSpending" defaultValue={values.maxSpending} />
              <RangeField label="Min outstanding" name="minOutstanding" defaultValue={values.minOutstanding} />
              <div className="space-y-1">
                <Label htmlFor="purchasedAfter" className="text-xs text-muted-foreground">
                  Purchased after
                </Label>
                <Input id="purchasedAfter" name="purchasedAfter" type="date" defaultValue={values.purchasedAfter} />
              </div>
            </div>
          </details>
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
}: {
  name: string;
  placeholder: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1">
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

function RangeField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input id={name} name={name} type="number" step="0.01" defaultValue={defaultValue} />
    </div>
  );
}
