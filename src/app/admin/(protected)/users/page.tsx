import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Table, Thead, Th, Tbody, Td, EmptyState } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { ADMIN_ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import type { AdminProfile } from "@/types/database";

export const metadata: Metadata = { title: "Users & Roles" };

export default async function UsersPage() {
  const currentAdmin = await requireAdmin();
  const isSuperAdmin = currentAdmin.profile.role === "super_admin";

  const db = createAdminClient();
  const { data } = await db.from("admin_profiles").select("*").order("created_at");
  const profiles = (data ?? []) as AdminProfile[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-charcoal">Users &amp; Roles</h1>
        <p className="text-sm text-charcoal/60">Manage admin panel access. Roles: Super Admin, Admin, Product Manager, Content Manager.</p>
      </div>

      {isSuperAdmin && (
        <Card>
          <CardHeader><h2 className="font-serif text-lg">Add Admin User</h2></CardHeader>
          <CardBody><CreateUserForm /></CardBody>
        </Card>
      )}

      {profiles.length === 0 ? (
        <EmptyState message="No admin users found." />
      ) : (
        <Table>
          <Thead>
            <Th>Name</Th><Th>Role</Th><Th>Status</Th><Th>Last Login</Th>{isSuperAdmin && <Th>Actions</Th>}
          </Thead>
          <Tbody>
            {profiles.map((p) => (
              <tr key={p.id}>
                <Td>{p.full_name}</Td>
                <Td><Badge tone="slate">{ADMIN_ROLE_LABELS[p.role]}</Badge></Td>
                <Td><Badge tone={p.is_active ? "green" : "red"}>{p.is_active ? "Active" : "Inactive"}</Badge></Td>
                <Td className="text-xs text-charcoal/50">{formatDateTime(p.last_login_at)}</Td>
                {isSuperAdmin && <Td><UserRowActions profile={p} isSelf={p.id === currentAdmin.id} /></Td>}
              </tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
