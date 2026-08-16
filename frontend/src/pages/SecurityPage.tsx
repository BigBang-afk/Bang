import { useState } from 'react';
import type { FormEvent } from 'react';
import { AppShell } from '../components/AppShell';
import { PasswordInput } from '../components/PasswordInput';
import { useAuth } from '../auth/AuthContext';
import { ApiError, apiJson } from '../api/client';

export function SecurityPage() {
  const { user, refreshUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);

  if (!user) return null;

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    setPwSubmitting(true);
    try {
      await apiJson('/users/me/password', {
        method: 'PATCH',
        body: { currentPassword, newPassword },
      });
      setPwSuccess('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setPwSubmitting(false);
    }
  };

  const startEnroll = async () => {
    setMfaError('');
    setMfaBusy(true);
    try {
      const data = await apiJson<{ qrCodeDataUrl: string }>('/auth/mfa/enroll', {
        method: 'POST',
      });
      setQrCodeDataUrl(data.qrCodeDataUrl);
    } catch (err) {
      setMfaError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmEnroll = async (e: FormEvent) => {
    e.preventDefault();
    setMfaError('');
    setMfaBusy(true);
    try {
      await apiJson('/auth/mfa/enroll/confirm', { method: 'POST', body: { code: enrollCode } });
      setMfaSuccess('Two-factor authentication enabled.');
      setQrCodeDataUrl(null);
      setEnrollCode('');
      await refreshUser();
    } catch (err) {
      setMfaError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async (e: FormEvent) => {
    e.preventDefault();
    setMfaError('');
    setMfaBusy(true);
    try {
      await apiJson('/auth/mfa/disable', { method: 'POST', body: { code: disableCode } });
      setMfaSuccess('Two-factor authentication disabled.');
      setDisableCode('');
      await refreshUser();
    } catch (err) {
      setMfaError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setMfaBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="section-title">
        <h2>Security</h2>
      </div>

      <div className="panel" style={{ maxWidth: 600 }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Password</h3>
        <p className="text-muted" style={{ marginTop: 0 }}>
          Change the password used to sign in.
        </p>
        {pwError && <div className="alert alert-error">{pwError}</div>}
        {pwSuccess && <div className="alert alert-success">{pwSuccess}</div>}
        <form onSubmit={handlePasswordSubmit}>
          <PasswordInput
            label="Current password"
            value={currentPassword}
            onChange={setCurrentPassword}
            autoComplete="current-password"
            required
          />
          <PasswordInput
            label="New password"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            required
          />
          <button type="submit" className="btn btn-secondary" disabled={pwSubmitting}>
            Update password
          </button>
        </form>
      </div>

      <div className="panel" style={{ maxWidth: 600 }}>
        <h3 style={{ marginBottom: '0.5rem' }}>Two-factor authentication</h3>
        <p className="text-muted" style={{ marginTop: 0 }}>
          Add a time-based one-time code (TOTP) requirement to your sign-in.
        </p>
        {mfaError && <div className="alert alert-error">{mfaError}</div>}
        {mfaSuccess && <div className="alert alert-success">{mfaSuccess}</div>}

        {user.mfaEnabled ? (
          <>
            <span className="badge badge-success" style={{ marginBottom: '1rem', display: 'inline-block' }}>
              Enabled
            </span>
            <form onSubmit={disableMfa}>
              <div className="field" style={{ maxWidth: 200 }}>
                <label htmlFor="disableCode">Current code</label>
                <input
                  id="disableCode"
                  type="text"
                  maxLength={6}
                  inputMode="numeric"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-danger" disabled={mfaBusy}>
                Disable two-factor
              </button>
            </form>
          </>
        ) : (
          <>
            <span className="badge" style={{ marginBottom: '1rem', display: 'inline-block' }}>
              Not enabled
            </span>
            {!qrCodeDataUrl ? (
              <div>
                <button className="btn btn-secondary" onClick={startEnroll} disabled={mfaBusy}>
                  Set up two-factor authentication
                </button>
              </div>
            ) : (
              <>
                <div className="qr-box" style={{ marginBottom: '1rem' }}>
                  <img src={qrCodeDataUrl} width={180} height={180} alt="MFA QR code" />
                </div>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                  Scan with an authenticator app, then enter the 6-digit code to confirm.
                </p>
                <form onSubmit={confirmEnroll}>
                  <div className="field" style={{ maxWidth: 200 }}>
                    <label htmlFor="enrollCode">Confirmation code</label>
                    <input
                      id="enrollCode"
                      type="text"
                      maxLength={6}
                      inputMode="numeric"
                      value={enrollCode}
                      onChange={(e) => setEnrollCode(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: 'auto' }} disabled={mfaBusy}>
                    Confirm &amp; enable
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
