import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { SupportApi, apiErrorMessage } from "../../api/endpoints";
import { LoadingSkeleton, EmptyState } from "../../components/ui/States";
import { Modal } from "../../components/ui/Modal";
import { useToastStore } from "../../store/uiStore";

const STATUS_LABELS = ["Open", "In Progress", "Waiting on User", "Resolved", "Closed"];
const PRIORITY_LABELS = ["Low", "Normal", "High", "Urgent"];

export default function SupportTicketsPage() {
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("General");
  const [message, setMessage] = useState("");

  const { data: tickets, isLoading } = useQuery({ queryKey: ["my-tickets"], queryFn: SupportApi.mine });

  const create = useMutation({
    mutationFn: () => SupportApi.create({ subject, category, message, priority: 1 }),
    onSuccess: () => {
      pushToast("Support ticket created.", "success");
      setModalOpen(false);
      setSubject("");
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    onError: (err) => pushToast(apiErrorMessage(err), "error"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="page-heading">Support Tickets</h1>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>New ticket</button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : !tickets || tickets.length === 0 ? (
        <EmptyState title="No support tickets yet" action={<button className="btn-primary" onClick={() => setModalOpen(true)}>Open a ticket</button>} />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} to={`/app/support/${t.id}`} className="glass-card p-4 flex items-center justify-between hover:border-cyan-400/40 block">
              <div>
                <p className="text-sm font-medium text-slate-100">{t.subject}</p>
                <p className="text-xs text-slate-500 mt-1">{t.category} · {t.messageCount} messages</p>
              </div>
              <div className="text-right">
                <span className="badge-neutral">{STATUS_LABELS[t.status]}</span>
                <p className="text-xs text-slate-500 mt-1">{PRIORITY_LABELS[t.priority]}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New support ticket"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={!subject || !message || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Creating..." : "Create ticket"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="label-text">Subject</label>
            <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <label className="label-text">Category</label>
            <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>General</option>
              <option>Billing</option>
              <option>Technical</option>
              <option>Signal</option>
            </select>
          </div>
          <div>
            <label className="label-text">Message</label>
            <textarea className="input-field" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
