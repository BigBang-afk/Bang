import { listBranches, listUsersForBranchAssignment } from "@/services/branch.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddBranchDialog } from "@/components/business-intelligence/add-branch-dialog";
import { UserBranchAccessForm } from "@/components/business-intelligence/user-branch-access-form";

export const metadata = { title: "Branch Management | Zarghoon Jewellers" };

export default async function BranchManagementPage() {
  const [branches, users] = await Promise.all([listBranches(), listUsersForBranchAssignment()]);
  const branchOptions = branches.map((b) => ({ id: b.id, name: b.name }));

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">Branch Management</h1>
          <p className="text-sm text-muted-foreground">
            Multi-branch foundation — existing stock/sales/purchases/expenses stay unassigned (company-wide) until a future
            phase adds a branch picker to each creation flow.
          </p>
        </div>
        <AddBranchDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {branches.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No branches yet — every existing transaction is treated as company-wide.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-mono text-xs">{branch.branchCode}</TableCell>
                    <TableCell>{branch.name}</TableCell>
                    <TableCell>{branch.city ?? "—"}</TableCell>
                    <TableCell>{branch.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={branch.status === "ACTIVE" ? "success" : "neutral"}>{branch.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Branch Access</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            A user must not see another branch&apos;s financial data without permission — branchId is never trusted from the
            frontend; every branch-scoped query resolves the current user&apos;s authorized set server-side.
          </p>
          {users.map((user) => (
            <UserBranchAccessForm
              key={user.userId}
              userId={user.userId}
              userName={user.userName}
              branchAccessMode={user.branchAccessMode}
              authorizedBranchIds={user.authorizedBranchIds}
              branches={branchOptions}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
