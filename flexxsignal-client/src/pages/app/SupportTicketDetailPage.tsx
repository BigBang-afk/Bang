import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SupportApi } from "../../api/endpoints";
import { LoadingSkeleton, ErrorState } from "../../components/ui/States";
import { useAuthStore } from "../../store/authStore";

export default function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.userId);
  const [message, setMessage] = useState("");

  const { data: ticket, isLoading, error } = useQuery({ queryKey: ["ticket", id], queryFn: () => SupportApi.byId(id!), enabled: !!id });

  const addMessage = useMutation({
    mutationFn: () => SupportApi.addMessage(id!, message),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
    },
  });

  if (isLoading) return <LoadingSkeleton rows={3} />;
  if (error || !ticket) return <ErrorState message="Ticket not found." />;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link to="/app/support" className="text-sm text-cyan-400 hover:underline">&larr; Back to tickets</Link>
      <div className="glass-card p-6">
        <h1 className="text-xl font-bold text-slate-100">{ticket.subject}</h1>
        <p className="text-xs text-slate-500 mt-1">{ticket.category}</p>
      </div>

      <div className="space-y-3">
        {ticket.messages.map((m) => (
          <div key={m.id} className={`glass-card p-4 max-w-[80%] ${m.authorUserId === userId ? "ml-auto border-cyan-500/30" : ""}`}>
            <p className="text-xs text-slate-500 mb-1">{m.isFromStaff ? "Support team" : "You"} · {new Date(m.createdAtUtc).toLocaleString()}</p>
            <p className="text-sm text-slate-200">{m.message}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-4 flex gap-3">
        <input className="input-field flex-1" placeholder="Write a reply..." value={message} onChange={(e) => setMessage(e.target.value)} />
        <button className="btn-primary" disabled={!message || addMessage.isPending} onClick={() => addMessage.mutate()}>Send</button>
      </div>
    </div>
  );
}
