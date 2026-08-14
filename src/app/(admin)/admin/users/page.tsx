import type { Metadata } from "next";
import { Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { listAdminUsers, updateUserRoleAction } from "@/lib/actions/admin";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Users" };

const roleOptions = [
  { id: 1, name: "user" },
  { id: 2, name: "admin" },
  { id: 3, name: "superadmin" },
];

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  const users = await listAdminUsers();

  return (
    <div>
      <PageHeader
        title="Users"
        description="Every registered account. Role changes are restricted to superadmins and logged to the audit trail."
      />

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users yet" description="Registered users will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.displayName || user.fullName || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      {admin.role === "superadmin" ? (
                        <form action={updateUserRoleAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="userId" value={user.id} />
                          <Select name="roleId" defaultValue={String(user.roleId)}>
                            <SelectTrigger size="sm" className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {roleOptions.map((role) => (
                                <SelectItem key={role.id} value={String(role.id)}>
                                  {role.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="submit" size="sm" variant="ghost">
                            Save
                          </Button>
                        </form>
                      ) : (
                        <Badge variant="secondary" className="capitalize">
                          {user.roleName}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
