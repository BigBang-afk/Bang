import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, apiJson } from '../api/client';

export function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      const data = await apiJson<{ requested: boolean; devToken?: string }>(
        '/auth/password-reset/request',
        { method: 'POST', body: { identifier } },
      );
      let text = 'If that account exists, password reset instructions have been sent.';
      if (data.devToken) {
        text += ` (dev mode) Reset link: /reset-password?token=${data.devToken}`;
      }
      setMessage(text);
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
          Reset your password
        </h1>

        {error && <div className="alert alert-error">{error}</div>}
        {message && <div className="alert alert-success">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="identifier">Username, email, or phone</label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            Send reset link
          </button>
        </form>

        <div className="helper-text">
          <Link to="/login">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
