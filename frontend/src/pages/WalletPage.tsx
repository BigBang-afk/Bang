import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api/client";
import type { Deposit, Withdrawal } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function WalletPage() {
  const { user, refreshMe } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [toAddress, setToAddress] = useState("");
  const [asset, setAsset] = useState<"ETH" | "USDT">("USDT");
  const [amount, setAmount] = useState(10);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [depRes, wdRes] = await Promise.all([
      api.get<Deposit[]>("/wallet/deposits"),
      api.get<Withdrawal[]>("/wallet/withdrawals"),
    ]);
    setDeposits(depRes.data);
    setWithdrawals(wdRes.data);
    try {
      const addrRes = await api.get("/wallet/address");
      setAddress(addrRes.data.address);
    } catch (err: any) {
      setAddressError(err.response?.data?.error ?? "Wallet is not available right now");
    }
  }

  async function onWithdraw(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/wallet/withdrawals", { toAddress, asset, amountUsdCents: Math.round(amount * 100) });
      await load();
      await refreshMe();
      setToAddress("");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Withdrawal request failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="wallet-page">
      <h1>Wallet</h1>
      <p className="balance-large">${user ? (Number(user.balanceCents) / 100).toFixed(2) : "0.00"}</p>

      <section>
        <h2>Deposit</h2>
        <p>Send ETH or USDT (ERC20, Ethereum mainnet) to your address below. Credited automatically after {" "}
          confirmations on-chain.</p>
        {addressError ? (
          <div className="warning">{addressError}</div>
        ) : (
          <code className="address">{address ?? "loading..."}</code>
        )}
      </section>

      <section>
        <h3>Deposit history</h3>
        <table className="trades-table">
          <tbody>
            {deposits.length === 0 && <tr><td colSpan={4}>No deposits yet</td></tr>}
            {deposits.map((d) => (
              <tr key={d.id}>
                <td>{d.asset}</td>
                <td>${(Number(d.amountUsdCents) / 100).toFixed(2)}</td>
                <td>{d.status} ({d.confirmations} conf.)</td>
                <td><a href={`https://etherscan.io/tx/${d.txHash}`} target="_blank" rel="noreferrer">tx</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Withdraw</h2>
        <form onSubmit={onWithdraw} className="withdraw-form">
          <label>
            Asset
            <select value={asset} onChange={(e) => setAsset(e.target.value as "ETH" | "USDT")}>
              <option value="USDT">USDT</option>
              <option value="ETH">ETH</option>
            </select>
          </label>
          <label>
            To address
            <input value={toAddress} onChange={(e) => setToAddress(e.target.value)} placeholder="0x..." required />
          </label>
          <label>
            Amount (USD)
            <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Request withdrawal"}
          </button>
        </form>
        <p className="hint">Withdrawals are reviewed by an admin before being broadcast on-chain.</p>
      </section>

      <section>
        <h3>Withdrawal history</h3>
        <table className="trades-table">
          <tbody>
            {withdrawals.length === 0 && <tr><td colSpan={4}>No withdrawals yet</td></tr>}
            {withdrawals.map((w) => (
              <tr key={w.id}>
                <td>{w.asset}</td>
                <td>${(Number(w.amountUsdCents) / 100).toFixed(2)}</td>
                <td>{w.status}</td>
                <td>{w.txHash ? <a href={`https://etherscan.io/tx/${w.txHash}`} target="_blank" rel="noreferrer">tx</a> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
