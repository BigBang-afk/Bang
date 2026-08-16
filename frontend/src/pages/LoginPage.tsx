import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { PasswordInput } from '../components/PasswordInput';
import { ApiError } from '../api/client';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaMode, setMfaMode] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await login(identifier, password, mfaMode ? totpCode : undefined);
      if (result.mfaRequired) {
        setMfaMode(true);
        setSubmitting(false);
        return;
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div className="centered-page">
      <div className="card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '1.75rem' }}>
          <div className="brand-mark">Z</div>
          <div className="brand-title">Zarghoon Jewellers</div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!mfaMode ? (
            <>
              <div className="field">
                <label htmlFor="identifier">Username, email, or phone</label>
                <input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
              <PasswordInput
                label="Password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                required
              />
            </>
          ) : (
            <div className="field">
              <label htmlFor="totp">Authentication code</label>
              <input
                id="totp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                autoComplete="one-time-code"
                autoFocus
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting && <span className="spinner" />}
            {mfaMode ? 'Verify code' : 'Sign in'}
          </button>
        </form>

        {!mfaMode && (
          <div className="helper-text">
            <Link to="/forgot-password">Forgot your password?</Link>
          </div>
        )}
      </div>
    </div>
  );
}
