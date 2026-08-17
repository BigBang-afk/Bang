import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GOLD_PURITIES, PURITY_LABELS } from "@/types/gold";
import { STOCK_STATUSES, STOCK_STATUS_LABELS } from "@/types/inventory";
import type { ProductCategoryRow } from "@/services/product-category.service";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "NEWEST", label: "Newest" },
  { value: "OLDEST", label: "Oldest" },
  { value: "PRICE_HIGH", label: "Highest price" },
  { value: "PRICE_LOW", label: "Lowest price" },
  { value: "WEIGHT_HIGH", label: "Highest weight" },
  { value: "WEIGHT_LOW", label: "Lowest weight" },
  { value: "PROFIT_HIGH", label: "Highest expected profit" },
];

export function InventoryFilters({
  categories,
  values,
  basePath,
}: {
  categories: ProductCategoryRow[];
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
                placeholder="Search barcode, product, design no., category, supplier, karigar..."
                className="pl-9"
              />
            </div>
            <Button type="submit">Search</Button>
            <Button variant="ghost" asChild>
              <Link href={basePath}>Reset</Link>
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <FilterSelect
              name="categoryId"
              placeholder="Category"
              defaultValue={values.categoryId}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <FilterSelect
              name="purity"
              placeholder="Purity"
              defaultValue={values.purity}
              options={GOLD_PURITIES.map((p) => ({ value: p, label: PURITY_LABELS[p] }))}
            />
            <FilterSelect
              name="status"
              placeholder="Status"
              defaultValue={values.status}
              options={STOCK_STATUSES.map((s) => ({ value: s, label: STOCK_STATUS_LABELS[s] }))}
            />
            <div className="space-y-1">
              <Label htmlFor="supplier" className="text-xs text-muted-foreground">
                Supplier
              </Label>
              <Input id="supplier" name="supplier" defaultValue={values.supplier} placeholder="Any" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="karigar" className="text-xs text-muted-foreground">
                Karigar
              </Label>
              <Input id="karigar" name="karigar" defaultValue={values.karigar} placeholder="Any" />
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
              More filters (price, weight, date)
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <RangeField label="Min price" name="minPrice" defaultValue={values.minPrice} />
              <RangeField label="Max price" name="maxPrice" defaultValue={values.maxPrice} />
              <RangeField label="Min weight (g)" name="minWeight" defaultValue={values.minWeight} step="0.001" />
              <RangeField label="Max weight (g)" name="maxWeight" defaultValue={values.maxWeight} step="0.001" />
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
  step,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input id={name} name={name} type="number" step={step ?? "0.01"} defaultValue={defaultValue} />
    </div>
  );
}
