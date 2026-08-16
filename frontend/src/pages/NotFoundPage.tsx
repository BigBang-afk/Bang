import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="centered-page">
      <div className="card" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>Page not found</h1>
        <Link to="/dashboard" className="btn btn-secondary" style={{ marginTop: '1rem', width: 'auto', display: 'inline-flex' }}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
