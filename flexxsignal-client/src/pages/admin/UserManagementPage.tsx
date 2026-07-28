import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminApi } from "../../api/endpoints";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { LoadingSkeleton } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import { useToastStore } from "../../store/uiStore";
import type { AdminUserDto } from "../../types/domain";

export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<AdminUserDto | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const { data: users, isLoading } = useQuery({ queryKey: ["admin-users", search], queryFn: () => AdminApi.users(search || undefined) });
  const { data: roles } = useQuery({ queryKey: ["admin-roles"], queryFn: AdminApi.roles });

  const updateRoles = useMutation({
    mutationFn: () => AdminApi.updateRoles(editing!.id, selectedRoles),
    onSuccess: () => {
      pushToast("Roles updated.", "success");
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => AdminApi.setActive(id, isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const columns: Column<AdminUserDto>[] = [
    { header: "Email", render: (u) => u.email },
    { header: "Name", render: (u) => u.displayName },
    { header: "Roles", render: (u) => u.roles.join(", ") },
    { header: "Plan", render: (u) => u.currentPlan ?? "—" },
    { header: "Status", render: (u) => <span className={u.isActive ? "badge-up" : "badge-down"}>{u.isActive ? "Active" : "Disabled"}</span> },
    {
      header: "Actions",
      render: (u) => (
        <div className="flex gap-2">
          <button className="text-xs text-cyan-400 hover:underline" onClick={() => { setEditing(u); setSelectedRoles(u.roles); }}>Edit roles</button>
          <button className="text-xs text-slate-400 hover:underline" onClick={() => toggleActive.mutate({ id: u.id, isActive: !u.isActive })}>
            {u.isActive ? "Disable" : "Enable"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-heading">User Management</h1>
      <input className="input-field max-w-sm" placeholder="Search by email or name..." value={search} onChange={(e) => setSearch(e.target.value)} />

      {isLoading ? <LoadingSkeleton rows={5} /> : <DataTable columns={columns} rows={users ?? []} keyOf={(u) => u.id} />}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={`Edit roles: ${editing?.email}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn-primary" disabled={updateRoles.isPending} onClick={() => updateRoles.mutate()}>Save</button>
          </>
        }
      >
        <div className="space-y-2">
          {roles?.map((r) => (
            <label key={r} className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={selectedRoles.includes(r)}
                onChange={(e) => setSelectedRoles((prev) => (e.target.checked ? [...prev, r] : prev.filter((x) => x !== r)))}
              />
              {r}
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
