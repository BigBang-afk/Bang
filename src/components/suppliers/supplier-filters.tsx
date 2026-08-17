import Link from "next/link";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SUPPLIER_STATUSES, SUPPLIER_STATUS_LABELS } from "@/types/suppliers";

const SORT_OPTIONS = [
  { value: "NEWEST", label: "Newest" },
  { value: "OLDEST", label: "Oldest" },
  { value: "NAME", label: "Name (A–Z)" },
];

export function SupplierFilters({
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
                placeholder="Search name, company, phone, or supplier code..."
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
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select name="status" defaultValue={values.status}>
                <SelectTrigger>
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPLIER_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SUPPLIER_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Sort</Label>
              <Select name="sort" defaultValue={values.sort}>
                <SelectTrigger>
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
