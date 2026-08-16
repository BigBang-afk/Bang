import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <div className="centered-page">
      <div className="card" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>Access denied</h1>
        <p className="text-muted">You do not have permission to view this page.</p>
        <Link to="/dashboard" className="btn btn-secondary" style={{ marginTop: '1.5rem', width: 'auto', display: 'inline-flex' }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
