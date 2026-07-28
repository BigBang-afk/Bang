import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupportApi } from "../../api/endpoints";
import { DataTable, type Column } from "../../components/ui/DataTable";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import type { SupportTicketListItemDto } from "../../types/domain";

const STATUS_LABELS = ["Open", "In Progress", "Waiting on User", "Resolved", "Closed"];

export default function AdminSupportTicketsPage() {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: tickets, isLoading } = useQuery({ queryKey: ["admin-tickets"], queryFn: () => SupportApi.all() });
  const { data: ticket } = useQuery({ queryKey: ["ticket", openId], queryFn: () => SupportApi.byId(openId!), enabled: !!openId });

  const addMessage = useMutation({
    mutationFn: () => SupportApi.addMessage(openId!, reply),
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["ticket", openId] });
    },
  });

  const setStatus = useMutation({
    mutationFn: (status: number) => SupportApi.update(openId!, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket", openId] });
    },
  });

  const columns: Column<SupportTicketListItemDto>[] = [
    { header: "Subject", render: (t) => t.subject },
    { header: "Category", render: (t) => t.category },
    { header: "Status", render: (t) => <span className="badge-neutral">{STATUS_LABELS[t.status]}</span> },
    { header: "Messages", render: (t) => t.messageCount },
    { header: "Created", render: (t) => new Date(t.createdAtUtc).toLocaleString() },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-heading">Support Ticket Management</h1>
      {isLoading ? (
        <LoadingSkeleton rows={4} />
      ) : !tickets || tickets.length === 0 ? (
        <EmptyState title="No support tickets" />
      ) : (
        <DataTable columns={columns} rows={tickets} keyOf={(t) => t.id} onRowClick={(t) => setOpenId(t.id)} />
      )}

      <Modal open={!!openId} onClose={() => setOpenId(null)} title={ticket?.subject ?? "Ticket"}>
        {ticket && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {STATUS_LABELS.map((label, i) => (
                <button key={label} className={`text-xs px-2 py-1 rounded ${ticket.status === i ? "bg-cyan-500 text-navy-950" : "bg-navy-800 text-slate-300"}`} onClick={() => setStatus.mutate(i)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {ticket.messages.map((m) => (
                <div key={m.id} className="glass-card p-3">
                  <p className="text-xs text-slate-500">{m.isFromStaff ? "Staff" : "User"} · {new Date(m.createdAtUtc).toLocaleString()}</p>
                  <p className="text-sm text-slate-200 mt-1">{m.message}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="input-field flex-1" placeholder="Reply..." value={reply} onChange={(e) => setReply(e.target.value)} />
              <button className="btn-primary" disabled={!reply || addMessage.isPending} onClick={() => addMessage.mutate()}>Send</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
