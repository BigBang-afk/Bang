import { requirePermission, userHasPermission } from "@/lib/auth/dal";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { listCategories } from "@/services/product-category.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CreateCategoryForm } from "@/components/inventory/create-category-form";

export const metadata = { title: "Categories | Zarghoon Jewellers" };

export default async function CategoriesPage() {
  const user = await requirePermission(PERMISSIONS.INVENTORY_VIEW);
  const [categories, canManage] = await Promise.all([
    listCategories(),
    userHasPermission(user, PERMISSIONS.CATEGORY_MANAGE),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-xl font-semibold text-foreground">Categories</h1>
        <p className="text-sm text-muted-foreground">
          Product categories used across Inventory. Names must be unique.
        </p>
      </div>

      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Add Category</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateCategoryForm />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">{category.description || "—"}</TableCell>
                  <TableCell>{category.itemCount}</TableCell>
                  <TableCell>
                    <Badge variant={category.isSystem ? "neutral" : "default"}>
                      {category.isSystem ? "Default" : "Custom"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
