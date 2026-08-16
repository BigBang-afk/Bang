import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, apiJson } from '../api/client';
import { PasswordInput } from '../components/PasswordInput';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [token, setToken] = useState(searchParams.get('token') ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await apiJson('/auth/password-reset/confirm', {
        method: 'POST',
        body: { token, newPassword },
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="centered-page">
      <div className="card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '1rem' }}>
          <div className="brand-mark">Z</div>
          <div className="brand-title">Zarghoon</div>
        </div>
        <h1 style={{ fontSize: '1.4rem', textAlign: 'center', marginBottom: '1.5rem' }}>
          Set a new password
        </h1>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="token">Reset token</label>
            <input
              id="token"
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>
          <PasswordInput label="New password" value={newPassword} onChange={setNewPassword} required />
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            Update password
          </button>
        </form>

        <div className="helper-text">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
