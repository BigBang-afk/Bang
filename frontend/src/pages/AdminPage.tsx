import { useEffect, useState } from "react";
import { api } from "../api/client";

interface AdminUser {
  id: number;
  email: string;
  role: string;
  balanceCents: string;
  createdAt: string;
}

interface AdminDeposit {
  id: number;
  asset: string;
  amountUsdCents: string;
  status: string;
  confirmations: number;
  user: { email: string };
}

interface AdminWithdrawal {
  id: number;
  asset: string;
  amountUsdCents: string;
  status: string;
  toAddress: string;
  txHash: string | null;
  reviewNote: string | null;
  user: { email: string };
}

export function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [u, d, w] = await Promise.all([
      api.get<AdminUser[]>("/admin/users"),
      api.get<AdminDeposit[]>("/admin/deposits"),
      api.get<AdminWithdrawal[]>("/admin/withdrawals", { params: { status: "PENDING_REVIEW" } }),
    ]);
    setUsers(u.data);
    setDeposits(d.data);
    setWithdrawals(w.data);
  }

  async function approve(id: number) {
    setBusyId(id);
    try {
      await api.post(`/admin/withdrawals/${id}/approve`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: number) {
    const note = prompt("Reason for rejection?") ?? "Rejected by admin";
    setBusyId(id);
    try {
      await api.post(`/admin/withdrawals/${id}/reject`, { note });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-page">
      <h1>Admin</h1>

      <section>
        <h2>Pending withdrawals</h2>
        <table className="trades-table">
          <tbody>
            {withdrawals.length === 0 && <tr><td colSpan={6}>Nothing pending</td></tr>}
            {withdrawals.map((w) => (
              <tr key={w.id}>
                <td>{w.user.email}</td>
                <td>{w.asset}</td>
                <td>${(Number(w.amountUsdCents) / 100).toFixed(2)}</td>
                <td className="address-cell">{w.toAddress}</td>
                <td>
                  <button disabled={busyId === w.id} onClick={() => approve(w.id)}>Approve & send</button>
                  <button disabled={busyId === w.id} onClick={() => reject(w.id)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Users</h2>
        <table className="trades-table">
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>${(Number(u.balanceCents) / 100).toFixed(2)}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Recent deposits</h2>
        <table className="trades-table">
          <tbody>
            {deposits.map((d) => (
              <tr key={d.id}>
                <td>{d.user.email}</td>
                <td>{d.asset}</td>
                <td>${(Number(d.amountUsdCents) / 100).toFixed(2)}</td>
                <td>{d.status} ({d.confirmations} conf.)</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
